// WordPress supplies React at run time as wp.element, so there are no React
// types in this bundle. These declarations let TypeScript check the JSX.
declare namespace JSX {
  type Element = unknown
  interface IntrinsicElements {
    [tag: string]: Record<string, unknown>
  }
  interface IntrinsicAttributes {
    key?: string
  }
}
