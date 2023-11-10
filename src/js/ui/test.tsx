import { h, Fragment, render } from 'preact';
//import { useState } from 'preact/hooks';

interface State {
  foo: number;
  bar: number;
}

function Test({state}: {state: State}) {
  return <>
    <div>foo = {state.foo}</div>
    <div>bar = {state.bar}</div>
    <button onClick={() => state.foo++}>Inc Foo</button>
    <button onClick={() => state.bar++}>Inc Bar</button>
  </>;
}

const state = {foo: 1, bar: 2};
render(<Test state={state}/>, document.body);
