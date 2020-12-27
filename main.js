const fs = require('fs');
const { start, spawn, dispatch, stop, spawnStateless } = require('nact');
const system = start();

const DISTRIBUTOR = "DISTRIBUTOR"
const WORKER = "WORKER"
const COLLECTOR = "COLLECTOR"

const TOTAL_USERS = 30;

const DISTRIBUTOR_RECEIVE_ITEM_FROM_MAIN = "DISTRIBUTOR_RECEIVE_ITEM_FROM_MAIN"
const DISTRIBUTOR_RECEIVE_ITEM_FROM_WORKER = "DISTRIBUTOR_RECEIVE_ITEM_FROM_WORKER"

const DISTRIBUTOR_SEND_ITEM_TO_WORKER = "DISTRIBUTOR_SEND_ITEM_TO_WORKER"
const DISTRIBUTOR_SEND_ITEM_TO_COLLECTOR = "DISTRIBUTOR_SEND_ITEM_TO_COLLECTOR"
const DISTRIBUTOR_SEND_ITEM_TO_RESULTS = "DISTRIBUTOR_SEND_ITEM_TO_PRINTER"

const COLLECTOR_SEND_ITEMS_TO_DISTRIBUTOR = "COLLECTOR_SEND_ITEMS_TO_DISTRIBUTOR"
const DISTRIBUTOR_REQUEST_ITEMS_FROM_COLLECTOR = "DISTRIBUTOR_REQUEST_ITEMS_FROM_COLLECTOR"

const SEND_FROM_CHILD_WORKER_TO_SERVICE_WORKER = "SEND_FROM_CHILD_WORKER_TO_SERVICE_WORKER"
const FINISHED_WORK_WITH_ALL_USERS = "FINISHED_WORK_WITH_ALL_USERS"

/**
 * Distributor service that distributes tasks to other services
 */
const distributor_service = spawn(
    system,
    (
        state={},
        payload,
        _) => {
        const { user } = payload
        switch (payload.type){
            case DISTRIBUTOR_RECEIVE_ITEM_FROM_MAIN:
                console.log(`Received item from main and sending to worker ${user.name}`)
                dispatch(worker_service, {type: DISTRIBUTOR_SEND_ITEM_TO_WORKER, user})
                break;
            case DISTRIBUTOR_RECEIVE_ITEM_FROM_WORKER:
                console.log(`Received item from worker ${user.name} sending to collector`)
                dispatch(collector_service, {type: DISTRIBUTOR_SEND_ITEM_TO_COLLECTOR, user})
                break;
            case FINISHED_WORK_WITH_ALL_USERS:
                console.log("Finished processing all users")
                dispatch(collector_service, {type: DISTRIBUTOR_REQUEST_ITEMS_FROM_COLLECTOR})
                break;
            case COLLECTOR_SEND_ITEMS_TO_DISTRIBUTOR:
                console.log("Got items from collector. Sending results to printer")
                dispatch(printer_service, {type: DISTRIBUTOR_SEND_ITEM_TO_RESULTS, results: payload.results})
                break;
        }
    },
    DISTRIBUTOR
);

/**
 * Worker service child that distributes items to worker actors (children)
 */

const worker_service_child = (parent, workerId) => spawnStateless(
    parent,
    (payload, ctx) => {
        const user = filterUser(payload.user)
        dispatch(ctx.parent, {type: SEND_FROM_CHILD_WORKER_TO_SERVICE_WORKER, user})
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
            case DISTRIBUTOR_SEND_ITEM_TO_WORKER:
                const workerId = assignedWorker(user)
                if(ctx.children.has(workerId)){
                    dispatch(ctx.children.get(workerId), {user})
                }else{
                    dispatch(worker_service_child(worker_service, workerId), {user})
                }
                return state
            case SEND_FROM_CHILD_WORKER_TO_SERVICE_WORKER:
                if(user){
                    console.log(`Accepted user '${user.name}' and sending back to dispatcher`)
                    dispatch(distributor_service, {type: DISTRIBUTOR_RECEIVE_ITEM_FROM_WORKER, user})
                }
                const newState = {
                    ...state,
                    workedOn: state.workedOn + 1
                }

                if(newState.workedOn === TOTAL_USERS){
                    dispatch(distributor_service, {type: FINISHED_WORK_WITH_ALL_USERS})
                }else{
                    console.log("New state", newState)
                }

                return newState
        }
    },
    WORKER
);

/**
 * Collector service
 */
const collector_service = spawn(
    system,
    ((state=[], payload, ctx) => {
        const {user, type} = payload
        switch (type){
            case DISTRIBUTOR_SEND_ITEM_TO_COLLECTOR:
                return [...state, user].sort((a, b) => a.rank > b.rank);
            case DISTRIBUTOR_REQUEST_ITEMS_FROM_COLLECTOR:
                dispatch(distributor_service, {type: COLLECTOR_SEND_ITEMS_TO_DISTRIBUTOR, results: state})
                break;
        }
    }),
    COLLECTOR
)

const printer_service = spawnStateless(
    distributor_service,
    ((payload, ctx) => {
        switch (payload.type){
            case DISTRIBUTOR_SEND_ITEM_TO_RESULTS:
                const { results } = payload
                console.log("Got results", results)
                break;
        }
    })
)



function entry(){
    fs.readFile('users.json', (err, data) => {
        if (err) throw err;
        const users = JSON.parse(data);
        console.log("Read successfully!")
        users.forEach(item=>{
            dispatch(distributor_service, {type: DISTRIBUTOR_RECEIVE_ITEM_FROM_MAIN, user: item})
        })
    });
}

const filterUser = (user) => user.rank % 2  === 0 ? user : null

function assignedWorker(user){
    if(user.name.startsWith("A") || user.name.startsWith("B")){
        return user.gpa <= 5 ? "0" : "1"
    }else{
        return user.gpa <= 5 ? "2" : "3"
    }
}

entry()


