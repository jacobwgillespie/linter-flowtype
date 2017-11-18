/* @flow */

import path from 'path'
import {Range} from 'atom'

import type {TextEditor} from 'atom'
import type {FileMetadata, Location, PackageConfig} from './types'

import {findCachedAsync} from 'atom-linter'

export const getFileMetadata = async (
  textEditor: TextEditor,
  config: PackageConfig,
  forceFindConfig: boolean
): Promise<?FileMetadata> => {
  const filePath = textEditor.getPath()

  if (!filePath) return null

  const fileText = textEditor.getText()
  const fileDirectory = path.dirname(filePath)

  const configFile =
    config.onlyLintIfConfigExists || forceFindConfig
      ? await findCachedAsync(fileDirectory, '.flowconfig')
      : null

  return {filePath, fileDirectory, fileText, configFile}
}

export function locationToRange({start, end}: Location) {
  return new Range([start.line - 1, start.column - 1], [end.line - 1, end.column])
}

export function toLinterLocation(loc: Location, filePath: ?string = null) {
  return {
    file: loc.source === '-' && filePath !== null ? filePath : loc.source,
    position: locationToRange(loc)
  }
}
