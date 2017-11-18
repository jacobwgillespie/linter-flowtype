/* @flow */

import {astToOutline} from 'flow-language-server/lib/pkg/nuclide-flow-rpc/lib/astToOutline'

import {getFileMetadata} from '../helpers'
import {runFlow} from '../flow'

import type {TextEditor} from 'atom'
import type {OutlinesProvider, PackageConfig} from '../types'

const outlines = (provider: OutlinesProvider, config: PackageConfig) => async (
  textEditor: TextEditor
) => {
  const fileMetadata = await getFileMetadata(textEditor, config, true)

  if (!fileMetadata) {
    return null
  }

  if (!fileMetadata.configFile) {
    return null
  }

  try {
    const result = await runFlow({
      config: config,
      args: ['ast'],
      fileMetadata,
      options: {
        stdin: fileMetadata.fileText,
        uniqueKey: 'linter-flowtype-ast'
      }
    })

    if (!result) {
      return null
    }

    const parsed = JSON.parse(result)
    return astToOutline(parsed)
  } catch (error) {
    if ((error.isInitializing || error.isChecking) && provider.getOutline) {
      return provider.getOutline(textEditor)
    }
    throw error
  }
}

export default outlines
