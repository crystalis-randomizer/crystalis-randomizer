import { h, Fragment, createRef } from 'preact';
import { useRef } from 'preact/hooks';

interface Child {
  props: Record<string, unknown>;
  ref: unknown;
}
interface ComputerProps {
  title?: string;
  selected?: string;
  children: Child[];
}

export function Computer({title = '', selected = '', children}: ComputerProps) {
  const tabs = [];
  const refs = new Map<string, any>();
  for (const c of children) {
    const tabRef = useRef();
    const pageRef = useRef();
    const name = c.props.name as string;
    const click = () => {
      for (const [n, [tab, page]] of refs) {
        (tab.current as Element).classList.toggle('selected', n == name);
        (page.current as Element).classList.toggle('visible', n == name);
      }
    };
    const tabClasses = ['line'];
    const pageClasses = ['page'];
    if (name === selected || (!selected && c === children[0])) {
      tabClasses.push('selected');
      pageClasses.push('visible');
    }
    const tab = <div class={tabClasses.join(' ')}
                     ref={tabRef}
                     onClick={click}>{name}</div>;
    const content = <div class={pageClasses.join(' ')}
                         ref={pageRef}>{c}</div>;
    tabs.push([tab, content]);
    refs.set(name, [tabRef, pageRef]);
  }
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
}

interface PageProps {
  name?: string;
  children: Child[];
}
export function Page({name = '', children}: PageProps) {
  const [] = [name]; // ignore unused
  return <>{children}</>;
}
