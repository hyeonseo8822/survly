/**
 * @function reportWebVitals
 * @description 웹 애플리케이션의 성능을 측정하기 위한 함수입니다.
 *              Core Web Vitals (CLS, FID, FCP, LCP, TTFB)를 측정하여
 *              전달된 콜백 함수(onPerfEntry)를 통해 결과를 보고합니다.
 *              이는 애플리케이션의 실제 사용자 경험을 분석하는 데 사용됩니다.
 * @param {function} onPerfEntry - 성능 측정 결과를 처리할 콜백 함수.
 */
const reportWebVitals = onPerfEntry => {
  if (onPerfEntry && onPerfEntry instanceof Function) {
    import('web-vitals').then(({ getCLS, getFID, getFCP, getLCP, getTTFB }) => {
      getCLS(onPerfEntry);
      getFID(onPerfEntry);
      getFCP(onPerfEntry);
      getLCP(onPerfEntry);
      getTTFB(onPerfEntry);
    });
  }
};

export default reportWebVitals;
