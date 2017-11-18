/* @flow */

import type {Point as atom$Point, TextEditor as atom$TextEditor, Range as atom$Range} from 'atom'

declare type HyperclickProvider = {
  // Use this to provide a suggestion for single-word matches.
  // Optionally set `wordRegExp` to adjust word-matching.
  getSuggestionForWord?: (
    textEditor: atom$TextEditor,
    text: string,
    range: atom$Range
  ) => Promise<?HyperclickSuggestion>,

  wordRegExp?: RegExp,

  // Use this to provide a suggestion if it can have non-contiguous ranges.
  // A primary use-case for this is Objective-C methods.
  getSuggestion?: (
    textEditor: atom$TextEditor,
    position: atom$Point
  ) => Promise<?HyperclickSuggestion>,

  // The higher this is, the more precedence the provider gets. Defaults to 0.
  priority?: number,

  // Must be unique. Used for analytics.
  providerName?: string
}

declare type HyperclickSuggestion = {
  // The range(s) to underline to provide as a visual cue for clicking.
  range: ?atom$Range | ?Array<atom$Range>,

  // The function to call when the underlined text is clicked.
  callback: (() => mixed) | Array<{rightLabel?: string, title: string, callback: () => mixed}>
}
