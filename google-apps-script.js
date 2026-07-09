/**
 * Instructions for setting up Google Sheets integration:
 * 1. Create a new Google Sheet.
 * 2. Go to Extensions > Apps Script.
 * 3. Delete any code in the editor and paste this entire script.
 * 4. Save the script (Ctrl+S / Cmd+S).
 * 5. Click "Deploy" > "New deployment" at the top right.
 * 6. Select type "Web app".
 * 7. Set "Execute as" to "Me (your email)".
 * 8. Set "Who has access" to "Anyone".
 * 9. Click "Deploy". (You may need to authorize the script during this step).
 * 10. Copy the "Web app URL" provided after deployment.
 * 11. Paste that URL into the `app.js` file in your project:
 *     const GOOGLE_SHEETS_WEB_APP_URL = 'PASTE_URL_HERE';
 */

function doPost(e) {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
    const data = JSON.parse(e.postData.contents);
    
    const DEPARTMENTS = ["ER", "Inpatient Admission", "Main Reception", "Maternity Ward", "NICU", "OR", "Laboratory", "Radiology"];
    const DEP_FIELDS = ["Total Staff", "Req PHENICS", "Available", "Functional", "Non-Functional", "Shared", "Additional Needed", "Comments"];

    // Check if the sheet is empty (needs headers)
    if (sheet.getLastRow() === 0) {
      const headers = [
        "Timestamp",
        "Facility Type", "Facility Name", "Area", "Assessor Name", "Assessment Date",
        "CR - Total Rooms", "CR - Req PHENICS", "CR - Existing", "CR - Functional", "CR - Non-Functional", "CR - Shared", "CR - Additional Needed", "CR - Comments",
        "TR - Total Rooms", "TR - Req PHENICS", "TR - Dedicated", "TR - Functional", "TR - Non-Functional", "TR - Shared", "TR - Additional Needed", "TR - Comments",
        "RD - Total Staff", "RD - Req PHENICS", "RD - Available", "RD - Functional", "RD - Non-Functional", "RD - Shared", "RD - Additional Needed", "RD - Comments"
      ];
      
      DEPARTMENTS.forEach(dep => {
        DEP_FIELDS.forEach(f => {
          headers.push(dep + " - " + f);
        });
      });

      sheet.appendRow(headers);
      const headerRange = sheet.getRange(1, 1, 1, headers.length);
      headerRange.setFontWeight("bold");
      headerRange.setBackground("#f3f4f6");
      sheet.setFrozenRows(1);
    }
    
    // Create the row data based on the form submission
    const facilityType = data.facilityType || "PHCC";
    
    const rowData = [
      new Date(), // Timestamp
      facilityType,
      data.phccName || "", // Using phccName because we kept the input name the same in HTML
      data.area || "",
      data.assessorName || "",
      data.assessmentDate || "",
      
      data.crTotalRooms || "",
      data.crReqPhenics || "",
      data.crExistingLaptops || "",
      data.crFunctionalLaptops || "",
      data.crNonFunctionalLaptops || "",
      data.crSharedLaptops || "",
      data.crAdditionalNeeded || "",
      data.crComments || "",
      
      data.trTotalRooms || "",
      data.trReqPhenics || "",
      data.trDedicatedLaptops || "",
      data.trFunctionalLaptops || "",
      data.trNonFunctionalLaptops || "",
      data.trSharedLaptops || "",
      data.trAdditionalNeeded || "",
      data.trComments || "",
      
      data.rdTotalStaff || "",
      data.rdReqPhenics || "",
      data.rdAvailableLaptops || "",
      data.rdFunctionalLaptops || "",
      data.rdNonFunctionalLaptops || "",
      data.rdSharedLaptops || "",
      data.rdAdditionalNeeded || "",
      data.rdComments || ""
    ];
    
    // Append Hospital department fields
    DEPARTMENTS.forEach(dep => {
      const prefix = dep.replace(/\s+/g, '').toLowerCase();
      rowData.push(data[prefix + "TotalStaff"] || "");
      rowData.push(data[prefix + "ReqPhenics"] || "");
      rowData.push(data[prefix + "Available"] || "");
      rowData.push(data[prefix + "Functional"] || "");
      rowData.push(data[prefix + "NonFunctional"] || "");
      rowData.push(data[prefix + "Shared"] || "");
      rowData.push(data[prefix + "AdditionalNeeded"] || "");
      rowData.push(data[prefix + "Comments"] || "");
    });
    
    sheet.appendRow(rowData);
    
    return ContentService.createTextOutput(JSON.stringify({ "status": "success", "message": "Row added successfully" }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ "status": "error", "message": error.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  return ContentService.createTextOutput("The PHCC Laptop Assessment Web App is running.")
    .setMimeType(ContentService.MimeType.TEXT);
}
