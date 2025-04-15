
import { extractCourseInfo } from "../course-utils";

describe("Course Utils", () => {
  test("extracts course length and participants correctly from eventClassHeader", () => {
    // Sample HTML from Eventor for a specific class
    const sampleHtml = `
      <div class="eventClassHeader"><div><h3>Medelsvår 4 Dam</h3>4 160 m, 24 startande</div><div class="customLinks">
        <a class="hoverableImageAndText16x16 list16x16 external" href="https://obasen.orientering.se/winsplits/online/sv/default.asp?page=table&amp;databaseId=94550&amp;categoryId=1" 
          title="Visa sträcktider i WinSplits Online" target="_blank">Sträcktider</a>
        <a class="hoverableImageAndText16x16 livelox16x16 external" 
          href="https://eventor.orientering.se/Home/RedirectToLivelox?redirectUrl=https%3a%2f%2fwww.livelox.com%2fViewer%3feventExternalIdentifier%3d0%253a44635-1%26classExternalId%3d575565-1" 
          title="Visa rutter i Livelox" target="_blank">Livelox</a>
      </div></div>
      <div class="eventClassHeader"><div><h3>Mycket lätt 2 Dam</h3>2 190 m, 11 startande</div></div>
    `;

    const result = extractCourseInfo(sampleHtml, "Medelsvår 4 Dam");
    
    expect(result.length).toBe(4160);
    expect(result.participants).toBe(24);
  });

  test("handles case when class is not found", () => {
    const sampleHtml = `
      <div class="eventClassHeader"><div><h3>Mycket lätt 2 Dam</h3>2 190 m, 11 startande</div></div>
    `;

    const result = extractCourseInfo(sampleHtml, "Non-existent class");
    
    expect(result.length).toBe(0);
    expect(result.participants).toBe(0);
  });

  test("extracts information correctly when there are multiple eventClassHeaders", () => {
    const sampleHtml = `
      <div class="eventClassHeader"><div><h3>Lätt 3 Dam</h3>3 100 m, 17 startande</div></div>
      <div class="eventClassHeader"><div><h3>Medelsvår 4 Dam</h3>4 160 m, 24 startande</div></div>
      <div class="eventClassHeader"><div><h3>Mycket lätt 2 Dam</h3>2 190 m, 11 startande</div></div>
    `;

    const result = extractCourseInfo(sampleHtml, "Medelsvår 4 Dam");
    
    expect(result.length).toBe(4160);
    expect(result.participants).toBe(24);
  });
});
