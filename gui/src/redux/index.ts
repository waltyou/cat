import { createStore, combineReducers, applyMiddleware } from 'redux';
import thunk from 'redux-thunk';
import appReducer from './reducers/appReducer';

// Combine all reducers
const rootReducer = combineReducers({
  app: appReducer,
});

// Create the store with middleware
export const store = createStore(
  rootReducer,
  applyMiddleware(thunk)
);

// Export types
export type RootState = ReturnType<typeof rootReducer>;
export type AppDispatch = typeof store.dispatch;
