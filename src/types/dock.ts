export type DockEdge = 'left' | 'right' | 'top' | 'bottom' | 'float';

export interface DockZone {
  edge: DockEdge;
  order: number;
}

export interface FloatState {
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex: number;
}

export interface PanelState {
  id: string;
  title: string;
  visible: boolean;
  dock: DockZone;
  size: number;
  minSize: number;
  maxSize: number;
  float: FloatState;
  lastDock?: DockZone;
}

export interface DockLayoutState {
  panels: Record<string, PanelState>;
  nextZIndex: number;
}
