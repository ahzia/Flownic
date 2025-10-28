import { BaseHandler } from '@core/BaseHandler'
import { HandlerInput, HandlerResult, HelpersAPI, HandlerInputUI } from '@common/types'

export class ParseTableToCSVHandler extends BaseHandler {
  readonly id = 'parse_table_to_csv'
  readonly name = 'Parse Table to CSV'
  readonly description = 'Extract table data from the page and convert it to CSV format'
  readonly category = 'data'
  readonly permissions = ['readDom']
  
  readonly inputSchema = {
    type: 'object',
    required: ['selector'],
    properties: {
      selector: { 
        type: 'string',
        description: 'CSS selector for the table element'
      },
      filename: { 
        type: 'string', 
        default: 'table-data.csv',
        description: 'Filename for the CSV file'
      },
      includeHeaders: { 
        type: 'boolean', 
        default: true,
        description: 'Whether to include table headers in CSV'
      },
      delimiter: { 
        type: 'string', 
        default: ',',
        description: 'CSV delimiter'
      }
    }
  }
  
  async execute(input: HandlerInput, helpers: HelpersAPI): Promise<HandlerResult> {
    const selector = typeof input.selector === 'string' ? input.selector : String(input.selector || '')
    const filename = typeof input.filename === 'string' ? input.filename : 'table-data.csv'
    const includeHeaders = typeof input.includeHeaders === 'boolean' ? input.includeHeaders : true
    const delimiter = typeof input.delimiter === 'string' ? input.delimiter : ','
    
    if (!selector || selector.trim() === '') {
      return {
        success: false,
        error: 'Selector is required and must be a string'
      }
    }
    
    try {
      // Check if table exists
      const nodeMeta = await helpers.findNodeMeta(selector)
      if (!nodeMeta || !nodeMeta.exists) {
        return {
          success: false,
          error: `Table not found: ${selector}`
        }
      }
      
      if (nodeMeta.tagName.toLowerCase() !== 'table') {
        return {
          success: false,
          error: `Element is not a table: ${selector}`
        }
      }
      
      // Parse table data
      const tableData = await helpers.parseTable(selector)
      
      if (!tableData || tableData.length === 0) {
        return {
          success: false,
          error: 'No data found in table'
        }
      }
      
      // Convert to CSV
      const csvContent = this.convertToCSV(tableData, includeHeaders, delimiter)
      
      // Download the CSV file
      await helpers.downloadFile(filename, csvContent, 'text/csv')
      
      return {
        success: true,
        data: { 
          filename, 
          rowCount: tableData.length,
          columnCount: tableData[0]?.length || 0,
          csvContent: csvContent.substring(0, 200) + '...' // Truncate for storage
        },
        snapshot: { selector, filename, originalData: tableData }
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to parse table to CSV'
      }
    }
  }
  
  async undo(_lastRunState: unknown, helpers: HelpersAPI): Promise<void> {
    try {
      // CSV download cannot be undone, but we can notify the user
      await helpers.notify('CSV file has been downloaded and cannot be undone', 'info')
    } catch (error) {
      console.error('Error undoing parse_table_to_csv:', error)
    }
  }
  
  getInputUI(): HandlerInputUI {
    return {
      fields: [
        this.createInputField({
          name: 'selector',
          label: 'Table Selector',
          type: 'text',
          required: true,
          placeholder: 'e.g., table, .data-table, #results-table'
        }),
        this.createInputField({
          name: 'filename',
          label: 'Filename',
          type: 'text',
          required: false,
          placeholder: 'e.g., table-data.csv'
        }),
        this.createInputField({
          name: 'includeHeaders',
          label: 'Include Headers',
          type: 'boolean',
          required: false
        }),
        this.createInputField({
          name: 'delimiter',
          label: 'CSV Delimiter',
          type: 'text',
          required: false,
          placeholder: ','
        })
      ],
      layout: 'vertical',
      validation: {
        validateOnChange: true,
        validateOnBlur: true,
        showErrors: true
      }
    }
  }
  
  private convertToCSV(data: string[][], includeHeaders: boolean, delimiter: string): string {
    if (!data || data.length === 0) return ''
    
    const rows: string[] = []
    
    // Add headers if requested
    if (includeHeaders && data[0]) {
      const headerRow = data[0].map(cell => this.escapeCSVField(cell, delimiter))
      rows.push(headerRow.join(delimiter))
    }
    
    // Add data rows
    const startRow = includeHeaders ? 1 : 0
    for (let i = startRow; i < data.length; i++) {
      const row = data[i].map(cell => this.escapeCSVField(cell, delimiter))
      rows.push(row.join(delimiter))
    }
    
    return rows.join('\n')
  }
  
  private escapeCSVField(field: string, delimiter: string): string {
    if (field === null || field === undefined) return ''
    
    const str = String(field)
    
    // If field contains delimiter, newline, or quote, wrap in quotes and escape quotes
    if (str.includes(delimiter) || str.includes('\n') || str.includes('"')) {
      return `"${str.replace(/"/g, '""')}"`
    }
    
    return str
  }
}

