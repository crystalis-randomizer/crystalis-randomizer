import { Main } from './ui/main';
import { h, render, Fragment } from 'preact';

render(<Main config={config}/>, document.getElementById(''));
document.body.classList.add('body-main');

// setTitle()
// addTab()
