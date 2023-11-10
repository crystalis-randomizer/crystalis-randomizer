import { h, Fragment } from 'preact';
import { useState } from 'preact/hooks';

import { State } from './state';
import { Computer, Page } from './computer';

export function Main({state}: {state: State}) {
  const [title, setTitle] = useState(state.title);
  state.on('titlechange', () => setTitle(state.title));

  return (<div class="main">
    <div class="header">
      <div class="left"><img src="images/left-animated.gif"></img></div>
      <div class="mid">{title}</div>
      <div class="right"><img src="images/right-animated.gif"></img></div>
    </div>
    <div class="body">
      <div class="topleft"></div>
      <div class="topmid"></div>
      <div class="toptee"></div>
      <div class="topmid"></div>
      <div class="topright"></div>
      <div class="left"></div>
      <div class="mid">{tabs.map(x => x[0])}</div>
      <div class="sep"></div>
      <div class="mid small">{tabs.map(x => x[1])}</div>
      <div class="right"></div>
      <div class="botleft"></div>
      <div class="botmid"></div>
      <div class="bottee"></div>
      <div class="botmid"></div>
      <div class="botright"></div>
    </div>
  </div>);






    <Computer title="Crystalis Randomizer v3.0.1">
    <Page name="Randomize">
      Seed: <input id="seed" type="text" size="16" value={seed}/>
      <button onClick={onNew}>New</button>
      <br/>
      <button>Generate</button>
      <button>Spoiler</button>

    {
      // rom file upload
      // last seed permalink
      // TODO - maybe move computer out to top level?
      //      - initial title "Loading..." (animated "..."?)
      //      - script to switch to "Error" title after failed load
      //      - "About" tab
      //      - refactor tabs to make it easier to add/remove?
      //      - switch to props for this somehow?
    }

    </Page>
    <Page name="Presets">Baz</Page>
    <Page name="Placement" selected={true}>
      Item placement method:<br/>
      <select><option>reverse</option></select>
    </Page>
    <Page name="Items">Qux</Page>
    <Page name="Maps">Corge</Page>
    <Page name="Enemies">Grault</Page>
  </Computer>;

  function onNew() {
    setSeed(
        Math.floor(Math.random() * 0x100000000)
            .toString(16)
            .padStart(8, '0'));
  }
}
