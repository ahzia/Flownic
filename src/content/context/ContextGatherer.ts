/**
 * Gathers context data from the page (selected text, page content, etc.)
 */
export class ContextGatherer {
  gatherContextData(): any[] {
    const dataPoints: any[] = []
    
    // Gather selected text
    const selection = window.getSelection()
    if (selection && selection.toString().trim()) {
      dataPoints.push({
        id: 'selected_text',
        name: 'Selected Text',
        type: 'context',
        value: {
          text: selection.toString().trim(),
          length: selection.toString().trim().length,
          source: 'user_selection'
        },
        source: 'selected_text',
        timestamp: Date.now()
      })
    }
    
    // Gather page content
    dataPoints.push({
      id: 'page_content',
      name: 'Page Content',
      type: 'context',
      value: {
        html: document.documentElement.outerHTML,
        title: document.title,
        url: window.location.href,
        source: 'page_dom'
      },
      source: 'page_content',
      timestamp: Date.now()
    })
    
    // Gather extracted text (no HTML tags)
    const extractedText = document.body.innerText || document.body.textContent || ''
    dataPoints.push({
      id: 'extracted_text',
      name: 'Extracted Text',
      type: 'context',
      value: {
        text: extractedText,
        length: extractedText.length,
        source: 'text_extraction'
      },
      source: 'extracted_text',
      timestamp: Date.now()
    })
    
    return dataPoints
  }
}

