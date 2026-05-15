// Mock data — extracted from design/patent_review/{data.js,summaries.js}.
// Used during development before Neon is populated.

import type { PatentView } from "./patents";

export const MOCK_PATENTS: PatentView[] = [
  { wipsonKey: "KR-10-2023-0089421", fileTitle: "EUV 노광공정용 펠리클 멤브레인 및 그 제조방법", titleKo: null, applicant: "삼성전자(주)", inventor: "김도훈 외 3인", appDate: "2023-07-12", pubDate: "2024-04-22", country: "KR", classifier: "반도체", ipc: "G03F 1/62", reviewStatus: "relevant", reviewer: "박경민", reviewDate: "2025-11-04", sourceUrl: "https://doi.org/kipris/KR-10-2023-0089421", pdfUrl: null, summaryMd: null, description: null },
  { wipsonKey: "US-2024-0118233-A1", fileTitle: "High-k Dielectric Stack with Atomic Layer Deposited HfO2 for 3nm Nodes", titleKo: null, applicant: "Intel Corporation", inventor: "Chen, Wei-Ming · Patel, Sanjay", appDate: "2023-10-04", pubDate: "2024-04-11", country: "US", classifier: "반도체", ipc: "H01L 21/28", reviewStatus: "relevant", reviewer: "오채리", reviewDate: "2025-11-05", sourceUrl: "https://patents.uspto.gov/US-2024-0118233-A1", pdfUrl: null, summaryMd: null, description: null },
  { wipsonKey: "KR-10-2024-0001523", fileTitle: "리튬 황 이차전지용 다공성 탄소-황 복합 전극재", titleKo: null, applicant: "LG에너지솔루션(주)", inventor: "이상효 외 4인", appDate: "2024-01-05", pubDate: "2024-07-19", country: "KR", classifier: "배터리", ipc: "H01M 4/36", reviewStatus: "maybe", reviewer: "조성호", reviewDate: "2025-11-03", sourceUrl: "https://doi.org/kipris/KR-10-2024-0001523", pdfUrl: null, summaryMd: null, description: null },
  { wipsonKey: "US-2024-0203456-A1", fileTitle: "CRISPR-Cas9 Mediated Gene Editing for Treatment of Sickle Cell Disease", titleKo: null, applicant: "Vertex Pharmaceuticals, Inc.", inventor: "Johnson, Mark · Liu, Hua", appDate: "2023-12-18", pubDate: "2024-06-20", country: "US", classifier: "바이오", ipc: "C12N 15/11", reviewStatus: "irrelevant", reviewer: "이지수", reviewDate: "2025-11-02", sourceUrl: "https://patents.uspto.gov/US-2024-0203456-A1", pdfUrl: null, summaryMd: null, description: null },
  { wipsonKey: "KR-10-2023-0123987", fileTitle: "유기발광 다이오드용 정공수송층 화합물 및 이를 포함하는 OLED 소자", titleKo: null, applicant: "LG디스플레이(주)", inventor: "길형진 외 2인", appDate: "2023-09-22", pubDate: "2024-03-29", country: "KR", classifier: "디스플레이", ipc: "H10K 50/15", reviewStatus: "relevant", reviewer: "박경민", reviewDate: "2025-11-06", sourceUrl: "https://doi.org/kipris/KR-10-2023-0123987", pdfUrl: null, summaryMd: null, description: null },
  { wipsonKey: "KR-10-2024-0034512", fileTitle: "3차원 적층 NAND 플래시 메모리 셀 구조 및 제조 방법", titleKo: null, applicant: "SK하이닉스(주)", inventor: "김도은 외 5인", appDate: "2024-02-28", pubDate: "2024-09-05", country: "KR", classifier: "반도체", ipc: "H10B 43/27", reviewStatus: null, reviewer: null, reviewDate: null, sourceUrl: "https://doi.org/kipris/KR-10-2024-0034512", pdfUrl: null, summaryMd: null, description: null },
  { wipsonKey: "US-2024-0301122-A1", fileTitle: "Solid-State Battery Electrolyte Composition with Garnet-Type Oxide", titleKo: null, applicant: "QuantumScape Corporation", inventor: "Singh, Arjun · Tanaka, Yuki", appDate: "2024-03-15", pubDate: "2024-09-19", country: "US", classifier: "배터리", ipc: "H01M 10/0562", reviewStatus: "maybe", reviewer: "조성호", reviewDate: "2025-11-05", sourceUrl: "https://patents.uspto.gov/US-2024-0301122-A1", pdfUrl: null, summaryMd: null, description: null },
  { wipsonKey: "KR-10-2023-0156789", fileTitle: "mRNA 백신용 지질 나노입자 제형 및 그 동결건조 방법", titleKo: null, applicant: "(주)셀트리온", inventor: "이신혜 외 6인", appDate: "2023-11-08", pubDate: "2024-05-15", country: "KR", classifier: "바이오", ipc: "A61K 39/12", reviewStatus: "relevant", reviewer: "이지수", reviewDate: "2025-11-06", sourceUrl: "https://doi.org/kipris/KR-10-2023-0156789", pdfUrl: null, summaryMd: null, description: null },
  { wipsonKey: "US-2024-0156788-A2", fileTitle: "GaN HEMT Power Device with Vertical Schottky Drain Contact", titleKo: null, applicant: "Texas Instruments Incorporated", inventor: "Rodriguez, Diego · Kim, Jaehee", appDate: "2023-11-30", pubDate: "2024-05-23", country: "US", classifier: "전력반도체", ipc: "H01L 29/778", reviewStatus: null, reviewer: null, reviewDate: null, sourceUrl: "https://patents.uspto.gov/US-2024-0156788-A2", pdfUrl: null, summaryMd: null, description: null },
  { wipsonKey: "KR-10-2024-0067890", fileTitle: "CMP 슬러리 조성물 및 이를 이용한 텅스텐 배선 평탄화 방법", titleKo: null, applicant: "(주)솔브레인", inventor: "강민정 외 2인", appDate: "2024-04-10", pubDate: "2024-10-25", country: "KR", classifier: "반도체소재", ipc: "C09G 1/02", reviewStatus: "irrelevant", reviewer: "박경민", reviewDate: "2025-11-04", sourceUrl: "https://doi.org/kipris/KR-10-2024-0067890", pdfUrl: null, summaryMd: null, description: null },
  { wipsonKey: "KR-10-2023-0098712", fileTitle: "초미세 패터닝을 위한 화학증폭형 포토레지스트 조성물", titleKo: null, applicant: "(주)동진쎄미켐", inventor: "김슬기 외 3인", appDate: "2023-08-17", pubDate: "2024-02-29", country: "KR", classifier: "반도체소재", ipc: "G03F 7/039", reviewStatus: "relevant", reviewer: "오채리", reviewDate: "2025-11-06", sourceUrl: "https://doi.org/kipris/KR-10-2023-0098712", pdfUrl: null, summaryMd: null, description: null },
  { wipsonKey: "US-2024-0089023-A1", fileTitle: "Monoclonal Antibody Targeting PD-L1 with Enhanced Fc Effector Function", titleKo: null, applicant: "Bristol-Myers Squibb Company", inventor: "Schwartz, Aaron · Yamada, Rie", appDate: "2023-09-12", pubDate: "2024-03-21", country: "US", classifier: "바이오", ipc: "C07K 16/28", reviewStatus: null, reviewer: null, reviewDate: null, sourceUrl: "https://patents.uspto.gov/US-2024-0089023-A1", pdfUrl: null, summaryMd: null, description: null },
  { wipsonKey: "KR-10-2024-0012398", fileTitle: "양자점 형광체를 포함하는 미니 LED 백라이트 유닛", titleKo: null, applicant: "삼성디스플레이(주)", inventor: "박민주 외 4인", appDate: "2024-01-30", pubDate: "2024-08-12", country: "KR", classifier: "디스플레이", ipc: "G02F 1/1335", reviewStatus: "maybe", reviewer: "조성호", reviewDate: "2025-11-03", sourceUrl: "https://doi.org/kipris/KR-10-2024-0012398", pdfUrl: null, summaryMd: null, description: null },
  { wipsonKey: "US-2024-0245612-A1", fileTitle: "Hybrid Bonding Process for Chiplet Integration in 2.5D Package", titleKo: null, applicant: "TSMC (Taiwan Semiconductor Manufacturing)", inventor: "Wu, Chen-Hua · Lim, Joon", appDate: "2024-02-09", pubDate: "2024-08-01", country: "US", classifier: "패키징", ipc: "H01L 24/29", reviewStatus: "relevant", reviewer: "박경민", reviewDate: "2025-11-05", sourceUrl: "https://patents.uspto.gov/US-2024-0245612-A1", pdfUrl: null, summaryMd: null, description: null },
  { wipsonKey: "KR-10-2023-0145672", fileTitle: "차세대 메모리용 강유전체 박막 및 그 결정화 방법", titleKo: null, applicant: "한양대학교 산학협력단", inventor: "전현지 외 1인", appDate: "2023-10-25", pubDate: "2024-04-30", country: "KR", classifier: "반도체", ipc: "H10N 30/87", reviewStatus: null, reviewer: null, reviewDate: null, sourceUrl: "https://doi.org/kipris/KR-10-2023-0145672", pdfUrl: null, summaryMd: null, description: null },
  { wipsonKey: "US-2024-0192345-A1", fileTitle: "Heterogeneous Integration of Silicon Photonic Transceiver with CMOS Driver", titleKo: null, applicant: "Cisco Technology, Inc.", inventor: "O'Brien, Sean · Park, Min-Jun", appDate: "2023-12-04", pubDate: "2024-06-13", country: "US", classifier: "광반도체", ipc: "G02B 6/12", reviewStatus: "maybe", reviewer: "오채리", reviewDate: "2025-11-05", sourceUrl: "https://patents.uspto.gov/US-2024-0192345-A1", pdfUrl: null, summaryMd: null, description: null },
  { wipsonKey: "KR-10-2024-0078901", fileTitle: "이중 게이트 구조의 게이트-올-어라운드 트랜지스터 및 제조 방법", titleKo: null, applicant: "삼성전자(주)", inventor: "손미리 외 5인", appDate: "2024-04-22", pubDate: "2024-11-01", country: "KR", classifier: "반도체", ipc: "H01L 29/06", reviewStatus: "relevant", reviewer: "이지수", reviewDate: "2025-11-06", sourceUrl: "https://doi.org/kipris/KR-10-2024-0078901", pdfUrl: null, summaryMd: null, description: null },
  { wipsonKey: "US-2024-0334467-A1", fileTitle: "Lipid Nanoparticle Composition for In Vivo CAR-T Cell Generation", titleKo: null, applicant: "Moderna, Inc.", inventor: "Anderson, Lauren · Cho, Hyun-Woo", appDate: "2024-03-29", pubDate: "2024-10-08", country: "US", classifier: "바이오", ipc: "A61K 9/127", reviewStatus: null, reviewer: null, reviewDate: null, sourceUrl: "https://patents.uspto.gov/US-2024-0334467-A1", pdfUrl: null, summaryMd: null, description: null },
  { wipsonKey: "KR-10-2023-0167823", fileTitle: "신경망 가속을 위한 인-메모리 컴퓨팅 SRAM 비트셀 구조", titleKo: null, applicant: "KAIST", inventor: "민선 외 3인", appDate: "2023-12-01", pubDate: "2024-06-07", country: "KR", classifier: "AI반도체", ipc: "G11C 11/412", reviewStatus: "relevant", reviewer: "조성호", reviewDate: "2025-11-05", sourceUrl: "https://doi.org/kipris/KR-10-2023-0167823", pdfUrl: null, summaryMd: null, description: null },
  { wipsonKey: "US-2024-0276598-A1", fileTitle: "Flexible OLED Display Encapsulation with Multilayer Barrier Film", titleKo: null, applicant: "LG Display Co., Ltd.", inventor: "Hwang, Min-Ho · Davis, Robert", appDate: "2024-03-11", pubDate: "2024-09-12", country: "US", classifier: "디스플레이", ipc: "H10K 50/844", reviewStatus: "irrelevant", reviewer: "박경민", reviewDate: "2025-11-04", sourceUrl: "https://patents.uspto.gov/US-2024-0276598-A1", pdfUrl: null, summaryMd: null, description: null },
];

export const CLASSIFIERS = ["반도체", "반도체소재", "전력반도체", "AI반도체", "패키징", "광반도체", "디스플레이", "배터리", "바이오"];

const SUMMARY_KR_EUV = `## 발명의 명칭
EUV 노광공정용 펠리클 멤브레인 및 그 제조방법

## 기술 분야
본 발명은 극자외선(EUV) 리소그래피 공정에 사용되는 펠리클(pellicle) 멤브레인에 관한 것으로, 특히 7nm 이하 첨단 노드에서 마스크를 보호하면서도 EUV 광 투과율을 유지할 수 있는 박막 구조 및 그 제조방법을 제공한다.

## 해결 과제
- 기존 폴리실리콘 기반 펠리클은 EUV 광 흡수율이 높아 90% 이상의 투과율 확보가 어려움
- 13.5nm EUV에 노출 시 열적 안정성이 부족하여 막의 변형·파손 발생
- 멤브레인 두께가 30nm 이하로 얇아지면 기계적 강도가 급격히 저하

## 해결 수단
다공성 그래핀 적층 구조 위에 **수십 nm 두께의 보론 카바이드(B4C) 보호층**을 화학기상증착(CVD)으로 형성하여, 광 투과율 91% 이상을 유지하면서 인장강도를 1.2배 향상시킨다.

## 핵심 구성요소
1. **다층 그래핀 코어** — 3~5층 적층, 두께 1.5~2.5nm
2. **B4C 보호층** — 양면 10nm씩, CVD로 형성
3. **몰리브덴 지지 프레임** — 둘레 폭 2mm

## 차별점
- 기존 SK하이닉스 KR-10-2022-0078901은 단층 그래핀 + Si 보호층 구조 → 본 발명은 다층 그래핀 + B4C로 내열성을 250℃까지 확보
- 청구항 1은 B4C 두께 비율(8~12nm)을 한정 → 회피 시 유의

## 적용 가능성
**개발 중인 EUV 마스크 보호 솔루션과 직접적 충돌 가능성 있음.** 회피 설계 또는 라이선싱 검토가 필요함.`;

export const MOCK_SUMMARIES: Record<string, string> = {
  "KR-10-2023-0089421": SUMMARY_KR_EUV,
};

export function getMockSummary(patent: PatentView): string {
  if (MOCK_SUMMARIES[patent.wipsonKey]) return MOCK_SUMMARIES[patent.wipsonKey];
  return `## 발명의 명칭
${patent.fileTitle}

## 기술 분야
본 발명은 ${patent.classifier} 분야의 기술에 관한 것으로, 출원인(${patent.applicant})이 ${patent.appDate}에 출원한 ${patent.country === "KR" ? "국내" : "해외"} 특허이다.

## 해결 과제
- (AI 요약 생성 대기 중)
- 위 영역은 변리사 프롬프트에 따라 자동 생성됩니다.

## 해결 수단
요약이 아직 생성되지 않았습니다. \`summary_md\` 컬럼이 채워지면 이 영역에 표시됩니다.

## 핵심 구성요소
1. 첫 번째 핵심 구성요소
2. 두 번째 핵심 구성요소

## 적용 가능성
**검토 의견:** 변리사 프롬프트에 따라 "개발 중인 기술과의 직접적 관련성"을 판단하는 핵심 의견이 들어갑니다.`;
}
