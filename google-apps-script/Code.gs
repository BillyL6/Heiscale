// March 27, 6:23 PM Version 4
// 

function doPost(e) {
  const LOCK = LockService.getScriptLock();
  try {
    // 1. Prevent concurrent write collisions
    LOCK.waitLock(10000); 
    
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getActiveSheet();
    var data = JSON.parse(e.postData.contents);
    
    // 2. Setup Headers (A to E)
    // A: CHAT ID | B: TIMESTAMP | C: LOCATION | D: USER MESSAGE | E: AI CHATBOT
    if (sheet.getLastRow() === 0) {
      var headers = ["CHAT ID", "TIMESTAMP", "LOCATION", "USER MESSAGE", "AI CHATBOT"];
      sheet.appendRow(headers);
      
      // Industrial Styling: Cyan background, black bold text
      sheet.getRange(1, 1, 1, 5)
           .setFontWeight("bold")
           .setBackground("#00fffb")
           .setFontColor("#000000")
           .setHorizontalAlignment("center");
      
      sheet.setFrozenRows(1);
    }

    // 3. Append the Row
    sheet.appendRow([
      data.chatId || "No ID",    // Column A
      data.timestamp,            // Column B
      data.location,             // Column C
      data.message,              // Column D (User input, including name/email if they typed it)
      data.ai_response           // Column E (What the bot said back)
    ]);

    // 4. Formatting for High-Density Data
    var lastRow = sheet.getLastRow();
    var rowRange = sheet.getRange(lastRow, 1, 1, 5);
    
    rowRange.setVerticalAlignment("top").setWrap(true);
    
    // Column Width Adjustments
    sheet.setColumnWidth(1, 110); // Chat ID
    sheet.setColumnWidth(2, 160); // Timestamp
    sheet.setColumnWidth(3, 180); // Location
    sheet.setColumnWidth(4, 400); // User Message
    sheet.setColumnWidth(5, 400); // AI Chatbot

    return ContentService.createTextOutput("SUCCESS").setMimeType(ContentService.MimeType.TEXT);

  } catch (err) {
    console.error(err);
    return ContentService.createTextOutput("ERROR: " + err).setMimeType(ContentService.MimeType.TEXT);
  } finally {
    LOCK.releaseLock();
  }
}
