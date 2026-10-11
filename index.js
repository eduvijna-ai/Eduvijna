/**
 * Worktree-local Expo entry. Required when node_modules is shared with the monorepo root:
 * expo/AppEntry.js resolves ../../App relative to node_modules/expo, not the project root.
 */
import registerRootComponent from 'expo/src/launch/registerRootComponent';
import App from './App';

registerRootComponent(App);
