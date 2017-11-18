/* @flow */

import {CompositeDisposable} from 'atom'

import {shutdownSpawnedServers} from './flow'
import CoverageView from './coverage-view'

// Providers
import buildAutocomplete from './providers/autocomplete'
import buildCoverageLinter from './providers/coverageLinter'
import buildDatatip from './providers/datatip'
import buildHyperclick from './providers/hyperclick'
import buildOutlines from './providers/outlines'
import buildStatusLinter from './providers/statusLinter'

// Types
import type {TextEditor} from 'atom'
import type {AutocompleteProvider, DatatipProvider, LinterProvider, OutlinesProvider} from './types'

// Enabled grammars
const grammarScopes = [
  'source.js',
  'source.js.jsx',
  'source.babel',
  'source.js-semantic',
  'source.es6'
]

export default {
  activate() {
    // Install dependencies
    require('atom-package-deps').install('linter-flowtype', true)

    // Initialize configuration
    this.config = {
      executablePath: '',
      hyperclickPriority: 0,
      lintOnChange: true,
      onlyLintIfConfigExists: true,
      showUncovered: false,
      useLocalFlowBin: true
    }

    // Set up subscriptions
    this.subscriptions = new CompositeDisposable()

    // Listen for lintOnChange changes
    let lintOnChangeRestartNotification
    let setOnce = false
    this.subscriptions.add(
      atom.config.observe('linter-flowtype.lintOnChange', lintOnChange => {
        if (
          lintOnChange !== this.config.lintOnChange &&
          lintOnChangeRestartNotification === undefined &&
          setOnce
        ) {
          lintOnChangeRestartNotification = atom.notifications.addSuccess(
            'Restart atom to update lint as-you-type?',
            {
              dismissable: true,
              buttons: [
                {
                  text: 'Restart',
                  onDidClick: () => atom.restartApplication()
                }
              ]
            }
          )
          lintOnChangeRestartNotification.onDidDismiss(() => {
            lintOnChangeRestartNotification = undefined
          })
        }
        this.config.lintOnChange = lintOnChange
        setOnce = true
      })
    )

    // Listen for executablePath changes
    this.subscriptions.add(
      atom.config.observe('linter-flowtype.executablePath', executablePath => {
        this.config.executablePath = executablePath
      })
    )

    // Listen for useLocalFlowBin changes
    this.subscriptions.add(
      atom.config.observe('linter-flowtype.useLocalFlowBin', useLocalFlowBin => {
        this.config.useLocalFlowBin = useLocalFlowBin
      })
    )

    // Listen for onlyLintIfConfigExists changes
    this.subscriptions.add(
      atom.config.observe('linter-flowtype.onlyLintIfConfigExists', onlyLintIfConfigExists => {
        this.config.onlyLintIfConfigExists = onlyLintIfConfigExists
      })
    )

    // Listen for hyperclickPriority changes
    this.config.hyperclickPriority = null
    let priorityRestartNotification
    this.subscriptions.add(
      atom.config.observe('linter-flowtype.hyperclickPriority', hyperclickPriority => {
        if (this.config.hyperclickPriority != null) {
          if (
            hyperclickPriority !== this.config.hyperclickPriority &&
            priorityRestartNotification === undefined
          ) {
            priorityRestartNotification = atom.notifications.addSuccess(
              'Restart atom to update linter-flowtype priority?',
              {
                dismissable: true,
                buttons: [
                  {
                    text: 'Restart',
                    onDidClick: () => atom.restartApplication()
                  }
                ]
              }
            )
            priorityRestartNotification.onDidDismiss(() => {
              priorityRestartNotification = undefined
            })
          }
        }
        this.config.hyperclickPriority = hyperclickPriority
      })
    )

    // Listen for showUncovered changes
    this.subscriptions.add(
      atom.config.observe('linter-flowtype.showUncovered', showUncovered => {
        this.config.showUncovered = showUncovered
        // lint again so that the coverage actually updates
        const view = atom.views.getView(atom.workspace.getActiveTextEditor())
        if (view) {
          atom.commands.dispatch(view, 'linter:lint')
        }
      })
    )

    // Listen for changing active pane item
    this.subscriptions.add(
      atom.workspace.onDidChangeActivePaneItem((item: ?TextEditor): void => {
        if (this.coverageView) {
          const coverage = this.coverages.get(item)
          if (coverage) {
            this.coverageView.update(coverage)
          } else {
            this.coverageView.reset()
          }
        }
      })
    )

    this.coverages = new WeakMap()
  },

  deactivate() {
    // Clear subscriptions
    this.subscriptions.dispose()

    // Shutdown any running flow servers
    shutdownSpawnedServers(this.config.executablePath)
  },

  provideLinter(): LinterProvider[] {
    // Provide status and coverage linters

    const statusLinter: LinterProvider = {
      name: 'Flow',
      scope: 'project',
      grammarScopes,
      lintsOnChange: this.config.lintOnChange,
      lint: null
    }
    statusLinter.lint = buildStatusLinter(statusLinter, this.config)

    const coverageLinter: LinterProvider = {
      name: 'Flow Coverage',
      scope: 'file',
      grammarScopes,
      lintsOnChange: this.config.lintOnChange,
      lint: null
    }
    coverageLinter.lint = buildCoverageLinter(
      coverageLinter,
      this.config,
      this.coverageView,
      this.coverages
    )

    return [statusLinter, coverageLinter]
  },

  provideAutocomplete(): AutocompleteProvider {
    // Provide autocomplete suggestions

    const provider: AutocompleteProvider = {
      selector: grammarScopes.map(item => `.${item}`).join(', '),
      disableForSelector: '.comment',
      inclusionPriority: 100,
      getSuggestions: null
    }
    provider.getSuggestions = buildAutocomplete(provider, this.config)

    return provider
  },

  provideHyperclick(): HyperclickProvider {
    // Provide hyperclick suggestions

    const provider: HyperclickProvider = {
      priority: this.config.hyperclickPriority,
      grammarScopes
    }
    provider.getSuggestionForWord = buildHyperclick(provider, this.config)

    return provider
  },

  provideOutlines(): OutlinesProvider {
    // Provide outlines data

    const provider: OutlinesProvider = {
      name: 'linter-flowtype',
      priority: 1,
      grammarScopes,
      updateOnEdit: true,
      getOutline: null
    }
    provider.getOutline = buildOutlines(provider, this.config)

    return provider
  },

  consumeDatatip(datatipService: any): void {
    // Consume datatip

    const provider: DatatipProvider = {
      providerName: 'linter-flowtype',
      priority: 1,
      grammarScopes,
      datatip: null
    }
    provider.datatip = buildDatatip(provider, this.config)

    this.subscriptions.add(datatipService.addProvider(provider))
  },

  consumeStatusBar(statusBar: any): void {
    // Consume status bar

    this.coverageView = new CoverageView()
    this.coverageView.initialize()
    this.statusBar = statusBar.addLeftTile({
      item: this.coverageView,
      priority: 10
    })
  }
}
