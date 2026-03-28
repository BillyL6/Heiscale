function doPost(e) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("Sheet1") || ss.getSheets()[0];

  // 1. Auto-create headers if the sheet is empty
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(["Chat ID", "Timestamp", "Location", "User Message", "AI Response"]);
    sheet.getRange(1, 1, 1, 5).setFontWeight("bold").setBackground("#f3f3f3");
  }

  try {
    var data = JSON.parse(e.postData.contents);

    // 2. Map the data from your Vercel chat.js
    sheet.appendRow([
      data.chatId || "N/A",       // Matches 'chatId' from your chat.js
      data.timestamp || "N/A",    // Matches 'timestamp'
      data.location || "N/A",     // Matches 'location'
      data.message || "",         // Matches 'message'
      data.ai_response || ""      // Matches 'ai_response'
    ]);

    return ContentService.createTextOutput("Success").setMimeType(ContentService.MimeType.TEXT);

  } catch (err) {
    return ContentService.createTextOutput("Error: " + err).setMimeType(ContentService.MimeType.TEXT);
  }
}
