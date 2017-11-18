/* @flow */

export type AutocompleteProvider = {
  selector: string,
  disableForSelector: string,
  inclusionPriority: number,
  getSuggestions: ?Function
}

export type DatatipProvider = {
  providerName: string,
  priority: number,
  grammarScopes: Array<string>,
  datatip: ?Function
}

export type FileMetadata = {
  filePath: string,
  fileDirectory: string,
  fileText: string,
  configFile: ?string
}

export type LinterProvider = {
  name: string,
  scope: string,
  grammarScopes: Array<string>,
  lintsOnChange: boolean,
  lint: ?Function
}

export type OutlinesProvider = {
  name: string,
  priority: number,
  grammarScopes: Array<string>,
  updateOnEdit: boolean,
  getOutline: ?Function
}

export type PackageConfig = {
  executablePath: string,
  hyperclickPriority: number,
  lintOnChange: boolean,
  onlyLintIfConfigExists: boolean,
  showUncovered: boolean,
  useLocalFlowBin: boolean
}

export type Position = {
  line: number,
  column: number,
  offset: number,
  end: number
}

export type Location = {
  source: string,
  type: string,
  start: Position,
  end: Position
}

export type CoverageObject = {
  expressions: {
    covered_count: number,
    uncovered_count: number,
    uncovered_locs: Location[]
  }
}

export type StatusMessage = {
  context: ?string,
  descr: string,
  type: string,
  loc?: Location,
  path: string,
  line: number,
  endline: number,
  start: number,
  end: number,
  indent?: number
}

export type StatusExtra = {
  message: StatusMessage[],
  children?: StatusExtra[]
}

export type StatusError = {
  kind: string,
  level: string,
  message: StatusMessage[],
  operation?: StatusMessage,
  extra?: StatusExtra[],
  trace?: StatusMessage[]
}

export type StatusObject = {
  flowVersion: string,
  errors: StatusError[],
  passed: boolean
}

export type TypeAtPosObject = {
  type: string,
  reasons: Array<{
    desc: string,
    loc: Location,
    path: string,
    line: number,
    endline: number,
    start: number,
    end: number
  }>,
  loc: Location,
  path: string,
  line: number,
  endline: number,
  start: number,
  end: number
}
