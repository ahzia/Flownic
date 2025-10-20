// Parse Table to CSV Handler - Extract table data and convert to CSV
export const meta = {
  id: 'parse_table_to_csv',
  name: 'Parse Table to CSV',
  version: '1.0.0',
  description: 'Extract table data from the page and convert it to CSV format',
  permissions: ['readDom'],
  inputSchema: {
    type: 'object',
    required: ['selector'],
    properties: {
      selector: { type: 'string' },
      filename: { type: 'string', default: 'table-data.csv' },
      includeHeaders: { type: 'boolean', default: true },
      delimiter: { type: 'string', default: ',' }
    }
  },
  category: 'core'
}

export async function run(input, helpers) {
  try {
    const { selector, filename = 'table-data.csv', includeHeaders = true, delimiter = ',' } = input
    
    // Check if table exists
    const nodeMeta = await helpers.findNodeMeta(selector)
    if (!nodeMeta) {
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
    const csvContent = convertToCSV(tableData, includeHeaders, delimiter)
    
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
      error: error.message
    }
  }
}

export async function undo(lastRunState, helpers) {
  try {
    // CSV download cannot be undone, but we can notify the user
    await helpers.notify('CSV file has been downloaded and cannot be undone', 'info')
  } catch (error) {
    console.error('Error undoing parse_table_to_csv:', error)
  }
}

// Helper function to convert table data to CSV
function convertToCSV(data, includeHeaders, delimiter) {
  if (!data || data.length === 0) return ''
  
  const rows = []
  
  // Add headers if requested
  if (includeHeaders && data[0]) {
    const headerRow = data[0].map(cell => escapeCSVField(cell))
    rows.push(headerRow.join(delimiter))
  }
  
  // Add data rows
  const startRow = includeHeaders ? 1 : 0
  for (let i = startRow; i < data.length; i++) {
    const row = data[i].map(cell => escapeCSVField(cell))
    rows.push(row.join(delimiter))
  }
  
  return rows.join('\n')
}

// Helper function to escape CSV fields
function escapeCSVField(field) {
  if (field === null || field === undefined) return ''
  
  const str = String(field)
  
  // If field contains delimiter, newline, or quote, wrap in quotes and escape quotes
  if (str.includes(delimiter) || str.includes('\n') || str.includes('"')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  
  return str
}
