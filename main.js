const fs = require('fs');
const { start, spawn, dispatch, spawnStateless } = require('nact');

const Actors = {
    DISTRIBUTOR: "DISTRIBUTOR",
    WORKER: "WORKER",
    COLLECTOR: "COLLECTOR",
    PRINTER: "PRINTER"
}

const Actions = {
    DISTRIBUTOR_RECEIVE_ITEM_FROM_MAIN: "DISTRIBUTOR_RECEIVE_ITEM_FROM_MAIN",
    DISTRIBUTOR_RECEIVE_ITEM_FROM_WORKER: "DISTRIBUTOR_RECEIVE_ITEM_FROM_WORKER",
    DISTRIBUTOR_SEND_ITEM_TO_WORKER: "DISTRIBUTOR_SEND_ITEM_TO_WORKER",
    DISTRIBUTOR_SEND_ITEM_TO_COLLECTOR: "DISTRIBUTOR_SEND_ITEM_TO_COLLECTOR",
    DISTRIBUTOR_SEND_ITEM_TO_RESULTS: "DISTRIBUTOR_SEND_ITEM_TO_PRINTER",
    COLLECTOR_SEND_ITEMS_TO_DISTRIBUTOR: "COLLECTOR_SEND_ITEMS_TO_DISTRIBUTOR",
    DISTRIBUTOR_REQUEST_ITEMS_FROM_COLLECTOR: "DISTRIBUTOR_REQUEST_ITEMS_FROM_COLLECTOR",
    SEND_FROM_CHILD_WORKER_TO_SERVICE_WORKER: "SEND_FROM_CHILD_WORKER_TO_SERVICE_WORKER",
    FINISHED_WORK_WITH_ALL_USERS: "FINISHED_WORK_WITH_ALL_USERS",
}

const TOTAL_USERS = 30;
const system = start();


/**
 * Distributor service that distributes tasks to other services
 */
const distributor_service = spawnStateless(
    system,
    (
        payload,
        _) => {
        const { user } = payload
        switch (payload.type){
            case Actions.DISTRIBUTOR_RECEIVE_ITEM_FROM_MAIN:
                console.log(`Received item from main and sending to worker ${user.name}`)
                dispatch(worker_service, {type: Actions.DISTRIBUTOR_SEND_ITEM_TO_WORKER, user})
                break;
            case Actions.DISTRIBUTOR_RECEIVE_ITEM_FROM_WORKER:
                console.log(`Received item from worker ${user.name} sending to collector`)
                dispatch(collector_service, {type: Actions.DISTRIBUTOR_SEND_ITEM_TO_COLLECTOR, user})
                break;
            case Actions.FINISHED_WORK_WITH_ALL_USERS:
                console.log("Finished processing all users")
                dispatch(collector_service, {type: Actions.DISTRIBUTOR_REQUEST_ITEMS_FROM_COLLECTOR})
                break;
            case Actions.COLLECTOR_SEND_ITEMS_TO_DISTRIBUTOR:
                console.log("Got items from collector. Sending results to printer")
                dispatch(printer_service, {type: Actions.DISTRIBUTOR_SEND_ITEM_TO_RESULTS, results: payload.results})
                break;
        }
    },
    Actors.DISTRIBUTOR
);

/**
 * Worker child spawned from worker service
 */

const worker_service_child = (parent, workerId) => spawnStateless(
    parent,
    (payload, ctx) => {
        const user = filterUser(payload.user)
        dispatch(ctx.parent, {type: Actions.SEND_FROM_CHILD_WORKER_TO_SERVICE_WORKER, user})
    },
    workerId
)


/**
 * Parent worker service
 */
const worker_service = spawn(
    system,
    (
        state={ workedOn: 0 },
        payload,
        ctx) => {

        const { user } = payload;

        switch (payload.type){
            case Actions.DISTRIBUTOR_SEND_ITEM_TO_WORKER:
                const workerId = assignedWorker(user)
                if(ctx.children.has(workerId)){
                    dispatch(ctx.children.get(workerId), {user})
                }else{
                    dispatch(worker_service_child(worker_service, workerId), {user})
                }
                return state
            case Actions.SEND_FROM_CHILD_WORKER_TO_SERVICE_WORKER:
                if(user){
                    console.log(`Accepted user '${user.name}' and sending back to dispatcher`)
                    dispatch(distributor_service, {type: Actions.DISTRIBUTOR_RECEIVE_ITEM_FROM_WORKER, user})
                }
                const newState = {
                    ...state,
                    workedOn: state.workedOn + 1
                }

                if(newState.workedOn === TOTAL_USERS){
                    dispatch(distributor_service, {type: Actions.FINISHED_WORK_WITH_ALL_USERS})
                }else{
                    console.log("New state", newState)
                }

                return newState
        }
    },
    Actors.WORKER
);

/**
 * Collector service
 */
const collector_service = spawn(
    distributor_service,
    ((state=[], payload, ctx) => {
        const {user, type} = payload
        switch (type){
            case Actions.DISTRIBUTOR_SEND_ITEM_TO_COLLECTOR:
                return [...state, user].sort((a, b) => a.rank > b.rank);
            case Actions.DISTRIBUTOR_REQUEST_ITEMS_FROM_COLLECTOR:
                dispatch(distributor_service, {type: Actions.COLLECTOR_SEND_ITEMS_TO_DISTRIBUTOR, results: state})
                break;
        }
    }),
    Actors.COLLECTOR
)

/**
 * Printer service
 */
const printer_service = spawnStateless(
    distributor_service,
    ((payload, ctx) => {
        switch (payload.type){
            case Actions.DISTRIBUTOR_SEND_ITEM_TO_RESULTS:
                const { results } = payload
                console.log("Got results. Writing to file", results)
                writeToFile(results)
                break;
        }
    }),
    Actors.PRINTER
)

/**
 * Write results to file using filestream
 * @param users
 */
function writeToFile(users){
    const writer = fs.createWriteStream('results.txt', {
        flags: 'a'
    })

    const nameIndentSpace = 20
    const rankIndentSpace = 10

    writer.write(`-------------------------------------------\n`)
    writer.write(`|Name${' '.repeat(16)}|Rank${' '.repeat(8)}|Gpa${' '.repeat(4)}|\n`)
    writer.write(`-------------------------------------------\n`)
    users.forEach(item=>{
        const {name, rank, gpa } = item
        writer.write(`|${name}${' '.repeat(nameIndentSpace - name.length)}`)
        writer.write(`|${rank}${' '.repeat(rankIndentSpace - (rank > 9 ? 0 : -1))}`)
        writer.write(`|${gpa}${' '.repeat(7 - gpa.toString().length)}|\n`)
    })
    writer.write(`-------------------------------------------\n`)
}

/**
 * Simple filter criteria
 * @param user
 * @returns {*|null}
 */
const filterUser = (user) => user.rank % 3  === 0 ? user : null

/**
 * Splits users for workers
 * based on name and gpa
 * @param user
 * @returns {string}
 */
function assignedWorker(user){
    if(user.name.startsWith("A") || user.name.startsWith("B")){
        return user.gpa <= 5 ? "0" : "1"
    }else{
        return user.gpa <= 5 ? "2" : "3"
    }
}


/**
 * Entry point
 *
 * Reads data from file
 * and sends to main dispatcher
 */
function entry(filename){
    fs.readFile(filename, (err, data) => {
        if (err) throw err;
        const users = JSON.parse(data);
        console.log("Read successfully!")
        users.forEach(item=>{
            dispatch(distributor_service, {type: Actions.DISTRIBUTOR_RECEIVE_ITEM_FROM_MAIN, user: item})
        })
    });
}

entry('users.json')