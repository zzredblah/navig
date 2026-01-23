/**
 * PDF 다운로드 유틸리티
 * html2canvas + jsPDF를 사용하여 HTML을 PDF로 변환 후 다운로드
 */
export async function downloadPdf(apiUrl: string, fileName: string): Promise<void> {
  const html2canvas = (await import('html2canvas')).default;
  const { jsPDF } = await import('jspdf');

  // API에서 HTML 가져오기
  const res = await fetch(apiUrl);
  if (!res.ok) throw new Error('PDF 생성에 실패했습니다');
  const htmlContent = await res.text();

  // 임시 컨테이너 생성
  const container = window.document.createElement('div');
  container.style.position = 'absolute';
  container.style.left = '-9999px';
  container.style.top = '0';
  container.style.width = '794px'; // A4 width at 96dpi
  container.style.background = 'white';
  container.style.padding = '40px';
  container.style.fontFamily = '-apple-system, BlinkMacSystemFont, sans-serif';
  container.style.fontSize = '14px';
  container.style.color = '#1f2937';

  // HTML 파싱 후 body 내용 추출
  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlContent, 'text/html');

  // style 태그 복사
  const styles = doc.querySelectorAll('style');
  styles.forEach((style) => {
    const cloned = style.cloneNode(true) as HTMLStyleElement;
    container.appendChild(cloned);
  });

  // body 내용 복사 (script 제외)
  const bodyContent = doc.body.cloneNode(true) as HTMLElement;
  const scripts = bodyContent.querySelectorAll('script');
  scripts.forEach((s) => s.remove());
  container.appendChild(bodyContent);

  window.document.body.appendChild(container);

  // 렌더링 대기
  await new Promise((resolve) => setTimeout(resolve, 200));

  // canvas 생성
  const canvas = await html2canvas(container, {
    scale: 2,
    useCORS: true,
    logging: false,
    width: 794,
    windowWidth: 794,
  });

  // PDF 생성 (A4)
  const pdf = new jsPDF('p', 'mm', 'a4');
  const pdfWidth = pdf.internal.pageSize.getWidth(); // 210mm
  const pdfHeight = pdf.internal.pageSize.getHeight(); // 297mm
  const imgWidth = pdfWidth;
  const imgHeight = (canvas.height * imgWidth) / canvas.width;

  // 페이지를 넘어가는 경우 여러 페이지로 분할
  let heightLeft = imgHeight;
  let position = 0;
  const imgData = canvas.toDataURL('image/png');

  pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
  heightLeft -= pdfHeight;

  while (heightLeft > 0) {
    position -= pdfHeight;
    pdf.addPage();
    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
    heightLeft -= pdfHeight;
  }

  pdf.save(`${fileName}.pdf`);

  // 정리
  window.document.body.removeChild(container);
}
