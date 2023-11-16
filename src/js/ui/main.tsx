import { Context, Fragment, createContext, h } from 'preact';
import { useContext, useMemo, useRef } from 'preact/hooks';

import { Signal, signal, useSignal, computed, useComputed } from '@preact/signals';
import { Config, ConfigField, ConfigPath } from '../config/config';

import { BoolFieldInfo, EnumFieldInfo, NumberFieldInfo } from '../config/info';
import { Computer, Page } from './computer';
import { constCaseToWords } from '../util';

interface State {
  selected: Signal<TabName>;
  config: Signal<Config>;
  error: Signal<string|undefined>;
  seed: Signal<string>;
}

function createState(): State {
  return {
    selected: signal('Randomize'),
    error: signal(undefined),
    config: signal(Config.create() as Config), // TODO - pull from URL.
    seed: signal(''), // TODO - pull from URL.
  };
}


// Add immutable setters to proto
//   Config.with(cfg, {placement: {check_beta: 5}});
// How to distinguish append vs replace for repeated???
// Immutable API in general???


const MainState: Context<State> = createContext(undefined!);

export function Main() {
  return <MainState.Provider children={[]} value={useMemo(createState, [])}>
    <div class="main">
      <div class="header">
        <div class="left"><img src="images/left-animated.gif"></img></div>
        <div class="mid">Crystalis Randomizer</div>
        <div class="right"><img src="images/right-animated.gif"></img></div>
      </div>
      <div class="body">
        <div class="topleft"></div>
        <div class="topmid"></div>
        <div class="toptee"></div>
        <div class="topmid"></div>
        <div class="topright"></div>
        <div class="left"></div>
        <div class="mid"><Tabs/></div>
        <div class="sep"></div>
        <div class="mid"><Content/></div>
        <div class="right"></div>
        <div class="botleft"></div>
        <div class="botmid"></div>
        <div class="bottee"></div>
        <div class="botmid"></div>
        <div class="botright"></div>
      </div>
    </div>
  </MainState.Provider>;
}

const TAB_NAMES = [
  'Randomize',
  'Presets',
  'Placement',
  'Items',
  'About',
] as const;
type TabName = (typeof TAB_NAMES)[number];

function Tabs() {
  const {error, selected} = useContext(MainState);
  if (error.value) return <div class="line selected">Error</div>;

  const tabs = TAB_NAMES.map(v => {
    const sel = v === selected.value;
    const classes = sel ? 'line selected' : 'line';
    const click = sel ? () => {} : () => selected.value = v;
    return <div class={classes} onClick={click}>{v}</div>;
  });

  return <>{tabs}</>;
}

function Content() {
  const {error, selected, config} = useContext(MainState);
  if (error.value) return <div class="error">{error.value}</div>;
  switch (selected.value) {
    case 'Randomize': return <Randomize/>;
    case 'Presets': return <Presets/>;
    case 'Placement': return <Placement/>;
    case 'Items': return <Items/>;
    case 'About': return <About/>;      
  }
}

function Randomize() {
  const {config, seed} = useContext(MainState);
  return <div>
    Seed: <input id="seed" type="text" size="16" value={seed}/>
    <button onClick={onNew}>New</button>
    <br/>
    <button>Generate</button>
    <button>Spoiler</button>
  </div>;

  function onNew() {
    seed.value =
        Math.floor(Math.random() * 0x100000000)
            .toString(16)
            .padStart(8, '0');
  }
}

function Presets() {
  return <div class="small">Presets</div>;
}

function Placement() {
  const {config} = useContext(MainState);
  //const {Placement: {Algorithm}, Randomization} = Config;
  const algorithm = new ConfigField('placement.algorithm');
  // TODO - use analysis...
  const noShuffle = (algorithm.get(config.value) ?? algorithm.default()) === Config.Placement.Algorithm.VANILLA;
  return <div class="small">
    <Select label="Algorithm"
            path="placement.algorithm"
            help="algorithm"/>
    <Slider label="Check Beta"
            path="placement.checkBeta"
            disabled={noShuffle ? 'requires Assumed Fill' : undefined}
            min={-3} max={3} incr={0.1}
            help="check beta"/>
    <Slider label="Item Beta"
            path="placement.itemBeta"
            disabled={noShuffle ? 'requires Assumed Fill' : undefined}
            min={-3} max={3} incr={0.1}
            help="item beta"/>
    <Slider label="Check Distribution"
            path="placement.checkDistributionWeight"
            disabled={noShuffle ? 'requires Assumed Fill' : undefined}
            min={0} max={10} incr={0.1}
            help="check distribution"/>
    <Select label="Mimics"
            path="placement.mimics"
            help="mimic placement"/>
    <Slider label="Mimic Count"
            path="placement.mimicCount"
            help="mimic count"/>
    <Checkbox label="Shuffle Mimics With Key Items"
              path="placement.shuffleMimicsWithKeyItems"
              disabled={noShuffle ? 'requires Assumed Fill' : undefined}
              help="mimics with key items"/>
    <pre>{JSON.stringify(config.toJSON(), undefined, 2)}</pre>
  </div>;
}

function useConfig(path: ConfigPath): [Signal<Config>, ConfigField] {
  const {config} = useContext(MainState);
  const field = useMemo(() => new ConfigField(path), [path]);
  return [config, field];
}

interface SelectProps {
  label: string;
  path: ConfigPath;
  help: string;
}
function Select(props: SelectProps) {
  const [config, field] = useConfig(props.path);
  if (!(field.info instanceof EnumFieldInfo)) {
    throw new Error(`bad select field ${field.path}, expected enum`);
  }
  const opts = [];
  const value = field.get(config.value) ?? field.default();
  const coerced = value != undefined ? field.info.coerce(value) : undefined;
  for (const k of field.info.enum.values) {
    const cased = constCaseToWords(k);
    const v = field.info.enum.enum.values[k];
    opts.push(<option value={v} selected={v === coerced}>{cased}</option>);
  }
  return <div>{props.label}: <select onChange={(e: any) => {
    config.value = field.set(config.value, Number(e.target.value));
  }}>{opts}</select></div>;
}

interface SliderProps {
  label: string;
  path: ConfigPath;
  min?: number;
  max?: number;
  incr?: number;
  // NOTE: log is broken, doesn't handle negatives correctly
  log?: number; // orders of magnitude below 1
  help: string;
  disabled?: string;
  // TODO - log transformer?
  // TODO - incorporate cumulative min/max into state???
  // TODO - validator
}
function Slider(props: SliderProps) {
  const [config, field] = useConfig(props.path);
  if (!(field.info instanceof NumberFieldInfo)) {
    throw new Error(`bad slider field ${field.path}, expected number`);
  }
  const toPos = props.log != null ? (x: number) => !x ? 0 : Math.sign(x) * Math.log10(Math.abs(x)) + props.log : (x: number) => x;
  const fromPos = props.log != null ? (x: number) => !x ? 0 : Math.sign(x) * Math.round(10 ** (Math.abs(x) - props.log + 2)) / 100 : (x: number) => x;
  const value = (field.get(config.value) ?? field.default()) as number;
  const min = useSignal(Math.min(toPos(value), props.min ?? field.info.min));
  const max = useSignal(Math.max(toPos(value), props.max ?? field.info.max));
  const step = props.incr ?? 1;
  // TODO - use a local signal for the value to sync the number with the slider

  // const onChange = (e: any) => {
  //   config.value = field.set(config.value, Number(e.target.value));
  // };

  const onChangeNum = (e: any) => {
    const val = field.info.coerce(Number(numRef.current.value)) as number;
    barVal.value = sliderVal.value = toPos(numVal.value = val);
    config.value = field.set(config.value, val);
    const vp = toPos(val);
    if (vp < min.value) min.value = vp;
    if (vp > max.value) max.value = vp;
  };

  const onChangeBar = (e: any) => {
    const val = field.info.coerce(fromPos(Number(barRef.current.value))) as number;
    barVal.value = sliderVal.value = toPos(numVal.value = val);
    config.value = field.set(config.value, val);
  };
  const onDragBar = (e: any) => {
    //(e) => val.value = Number(e.target.value)
    numVal.value = fromPos(barVal.value = Number(barRef.current.value));
  };

  // let dragging = false;
  const numRef = useRef<HTMLInputElement>();
  const barRef = useRef<HTMLInputElement>();

  const numVal = useSignal(value);
  const barVal = useSignal(toPos(value));
  const sliderVal = useSignal(toPos(value));

  // const barRef = useRef<HTMLDivElement>();
  // function updateVisual(v: number) {
  //   numRef.current.value = String(v);
  //   barRef.current.style.width = `${100 * (Math.max(min, Math.min(v, max)) - min) / (max - min)}%`;
  // }
  // function getVal(e: MouseEvent): number {
  //   return (e.offsetX / barRef.current.offsetWidth * (max - min) + min);
  // }
  // function mousedown(e: MouseEvent) {
  //   dragging = true;
  //   updateVisual(getVal(e));
  // }
  // function mouseup() {
  //   dragging = false;
  // }
  // function click(e: MouseEvent) {
  //   config.value = field.set(config.value, Number(getVal(e)));
  // }
  // function mousemove(e: MouseEvent) {
  //   if (dragging) updateVisual(getVal(e));
  // }

  return <div class={props.disabled ? 'disabled' : ''}>
    {props.label}:
    <input disabled={!!props.disabled} type="number" ref={numRef}
           min={min} max={max} step={step} value={numVal}
           onChange={onChangeNum}
    />
    <div class="pixel-slider">
      <PixelBar min={min.value} max={max.value} value={barVal}/>
      <input disabled={!!props.disabled} type="range" ref={barRef}
             min={min} max={max} step={step} value={sliderVal}
             onChange={onChangeBar} onInput={onDragBar}
      />
    </div>
  </div>
}

interface PixelBarProps {
  min: number;
  max: number;
  value: Signal<number>;
}

function PixelBar(props: PixelBarProps) {
  const {min, max, value} = props;

  const pct = 100 / (max - min);
  const val = Math.max(min, Math.min(value.value, max));
  const fullStyle: Record<string, string> = {};
  const zeroStyle: Record<string, string> = {};
  if (min >= 0) {
    zeroStyle.display = 'none';
    fullStyle.width = `${(val - min) * pct}%`;
    fullStyle.left = '0';
  } else if (max <= 0) {
    zeroStyle.display = 'none';
    fullStyle.width = `${(max - val) * pct}%`;
    fullStyle.right = '0';
  } else {
    const zero = -min * pct;
    zeroStyle.left = `${zero}%`;
    if (value.value < 0) {
      fullStyle.width = `${-value.value * pct}%`;
      fullStyle.right = `${100 - zero}%`;
      fullStyle.backgroundPositionX = 'right';
    } else {
      fullStyle.width = `${value.value * pct}%`;
      fullStyle.left = `${zero}%`;
      fullStyle.backgroundPositionX = 'left';
    }
  }
  return <div class="bar">
    <div class="inner">
      <div class="full" style={fullStyle}/>
      <div class="zero" style={zeroStyle}/>
    </div>
  </div>;
}


interface CheckboxProps {
  label: string;
  path: ConfigPath;
  help: string;
}
function Checkbox(props: CheckboxProps) {
  const [config, field] = useConfig(props.path);
  if (!(field.info instanceof BoolFieldInfo)) {
    throw new Error(`bad checkbox field ${field.path}, expected boolean`);
  }
  const value = field.get(config.value);
  const onChange = (e: any) => {
    //debugger;
    config.value = field.set(config.value, Boolean(e.target.checked));
  };
  return <div>{props.label}: <input
    type="checkbox" onChange={onChange} checked={value}/></div>;
}


// Select and Slider should expose some UI to set randomly?
//  - may require expanding vertically?


function Items() {
  return <div class="small">Items</div>;
}

function About() {
  const {config} = useContext(MainState);
  return <div class="small"><pre>{JSON.stringify(config.toJSON(), undefined, 2)}</pre></div>;
}

// rom file upload
// last seed permalink
// TODO - maybe move computer out to top level?
//      - initial title "Loading..." (animated "..."?)
//      - script to switch to "Error" title after failed load
//      - "About" tab
//      - refactor tabs to make it easier to add/remove?
//      - switch to props for this somehow?

