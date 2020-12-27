const fs = require('fs');
const { start, spawn, dispatch, stop, spawnStateless } = require('nact');
const system = start();

const DISTRIBUTOR = "DISTRIBUTOR"
const WORKER = "WORKER"


const DISTRIBUTOR_RECEIVE_ITEM_FROM_MAIN = "DISTRIBUTOR_RECEIVE_ITEM_FROM_MAIN"
const DISTRIBUTOR_RECEIVE_ITEM_FROM_WORKER = "DISTRIBUTOR_RECEIVE_ITEM_FROM_WORKER"

const DISTRIBUTOR_SEND_ITEM_TO_WORKER = "DISTRIBUTOR_SEND_ITEM_TO_WORKER"
const DISTRIBUTOR_SEND_ITEM_TO_COLLECTOR = "DISTRIBUTOR_SEND_ITEM_TO_COLLECTOR"
const DISTRIBUTOR_SEND_ITEM_TO_RESULTS = "DISTRIBUTOR_SEND_ITEM_TO_RESULTS"

/**
 * Distributor service that distributes tasks to other services
 */
const distributor_service = spawnStateless(
    system,
    (payload, ctx) => {
        const { user } = payload
        switch (payload.type){
            case DISTRIBUTOR_RECEIVE_ITEM_FROM_MAIN:
                console.log(`Received item from main and sending to worker ${user.name}`)
                dispatch(worker_service, {type: DISTRIBUTOR_SEND_ITEM_TO_WORKER, user})
                break;
            case DISTRIBUTOR_RECEIVE_ITEM_FROM_WORKER:
                console.log(`Received item from worker ${user.name}`)

        }
    },
    DISTRIBUTOR
);

/**
 * Worker service that distributes items to worker actors (children)
 */

const worker_service_child = (parent, workerId) => spawnStateless(
    parent,
    (payload, ctx) => {
        const { user } = payload;
        console.log(`Accepted user '${user.name}' and sending back -- WORKER: ${workerId}`)
        dispatch(distributor_service, {type: DISTRIBUTOR_RECEIVE_ITEM_FROM_WORKER, user})
    },
    workerId
)

const worker_service = spawnStateless(
    system,
    (payload, ctx) => {

        const { user } = payload;
        const workerId = assignedWorker(user)

        switch (payload.type){
            case DISTRIBUTOR_SEND_ITEM_TO_WORKER:
                const has = ctx.children.has(workerId)
                if(has){
                    dispatch(ctx.children.get(workerId), {user})
                }else{
                    dispatch(worker_service_child(ctx.self, workerId), {user})
                }
                break;
        }
    },
    WORKER
);







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

function assignedWorker(user){
    if(user.name.startsWith("A") || user.name.startsWith("B")){
        return user.gpa <= 5 ? "0" : "1"
    }else{
        return user.gpa <= 5 ? "2" : "3"
    }
}

entry()


