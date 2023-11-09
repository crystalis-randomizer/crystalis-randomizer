import {h, Fragment} from 'preact';

import {Computer, Page} from './computer';

export function Main() {
  return <Computer title="Crystalis Randomizer v3.0.1">
    <Page name="Randomize">Foo</Page>
    <Page name="Seed">Bar</Page>
    <Page name="Presets">Baz</Page>
    <Page name="Placement" selected={true}>
      Item placement method:<br/>
      <select><option>reverse</option></select>
    </Page>
    <Page name="Items">Qux</Page>
    <Page name="Maps">Corge</Page>
    <Page name="Enemies">Grault</Page>
  </Computer>;
}
