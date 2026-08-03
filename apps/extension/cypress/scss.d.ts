// Specs import the real stylesheets so measurement assertions run against shipped CSS.
// Vite handles these at runtime; tsc only needs to know the side-effect import is legal.
declare module '*.scss';
declare module '*.css';
