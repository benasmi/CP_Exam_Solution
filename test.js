const { start, spawn, dispatch, stop, spawnStateless } = require('nact');
const system = start();


const parent_service = spawnStateless(
    system,
    ((msg, _) => {
        dispatch(test_service, {})
    })
)


const test_service = spawn(
    parent_service,
    ((state={workedOn: 0}, msg, _) => {
        console.log(state)
        return {...state, workedOn: state.workedOn+1}
    })
)





dispatch(parent_service, {})
dispatch(parent_service, {})
dispatch(parent_service, {})
dispatch(parent_service, {})
dispatch(parent_service, {})
dispatch(parent_service, {})
