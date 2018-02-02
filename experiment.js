import { test } from 'ava';
import { createStore, applyMiddleware, combineReducers} from 'redux';
import fetch from 'isomorphic-fetch';


test('Basic middleware logging actions', t => {
  const reducer = () => ({});

  let c = 0;
  const counter = store => next => action => {
    if (action.type === 'COUNT') {
      c++;
    }
  };

  const middleware = applyMiddleware(counter);
  const store = createStore(reducer, middleware);

  store.dispatch({ type: 'COUNT' });
  store.dispatch({ type: 'ACTION_ONE' });
  store.dispatch({ type: 'COUNT' });

  t.is(c, 2);
});

test('Middleware application order is same as specification order', t => {
  const reducer = () => ({});

  let c = 0;
  const add = store => next => action => {
    c += action.amount;
    return next(action);
  };
  const square = store => next => action => {
    c = c * c;
    return next(action);
  };

  const middleware = applyMiddleware(add, square);
  const store = createStore(reducer, middleware);

  store.dispatch({ type: 'PLAY', amount: 2 });

  t.is(c, 4);
});


test('Simple promise middleware ', t => {
  const reducer = () => ({});

  const memory = [];
  const storeLast = store => next => action => {
    memory.push(action.value);
    next(action);
  };

  const promiseMiddleware = store => next => action => {
    if (action && typeof action.then === 'function') {
      action.then(next);
    } else {
      next(action);
    }
  };

  const middleware = applyMiddleware(promiseMiddleware, storeLast);
  const store = createStore(reducer, middleware);

  const p$ = new Promise((resolve) => { setTimeout(() => resolve({ type: 'PLAY', value: 100 }), 1000) });

  store.dispatch(p$);
  store.dispatch({ type: 'PLAY', value: 2 });

  return p$.then(() => {
    t.deepEqual(memory, [2, 100]);
  });
});


test.cb('Fetching something from an API', t => {
  const rootReducer = combineReducers({
    ships: (state = {}, action) => { 
      if (action.type === 'GET_SHIPS_DONE') {
        return action.value;
      }
      return state;
    }});

  const logger = store => next => action => {
    console.log("SEE", action);
    next(action);
  };

  const promiseMiddleware = store => next => action => {
    if (action && typeof action.then === 'function') {
      action.then(next);
    } else {
      next(action);
    }
  };

  const apiMiddleware = store => next => action => {
    const dispatch = store.dispatch;
    if (action.type === 'GET_SHIPS') {
      fetch('https://swapi.co/api/starships')
        .then(r => r.json())
        .then(data => dispatch({ type: 'GET_SHIPS_DONE', value: data }));
    } else {
      next(action);
    }
  };

  const middleware = applyMiddleware(logger, apiMiddleware, promiseMiddleware);
  const store = createStore(rootReducer, middleware);

  store.dispatch({ type: 'GET_SHIPS' });
  
  t.plan(2);

  setTimeout(() => {
    const ships = store.getState().ships;
    t.not(ships, undefined);
    t.is(ships.count, 37);
    t.end();
  }, 5000);
});















