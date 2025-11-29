import { useEffect, useRef } from "react";

export default function Map({ places = [] }) {
  const mapRef = useRef(null);

  useEffect(() => {
    // 이미 kakao 객체가 있는 경우 (중복로드 방지)
    if (window.kakao && window.kakao.maps) {
      initMap();
      return;
    }

    // 카카오 script 동적 로드
    const script = document.createElement("script");
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=6769ff1e824932a4aba8297bb6eab4df&libraries=services`;
    script.onload = () => initMap(); // 로드 완료 후 지도 생성
    document.head.appendChild(script);

    function initMap() {
      if (!mapRef.current) return;

      const kakao = window.kakao;

      const map = new kakao.maps.Map(mapRef.current, {
        center: new kakao.maps.LatLng(37.245833, 127.056667),
        level: 3,
      });

      // 🔥 저장된 places 마커 표시
      places.forEach(p => {
        new kakao.maps.Marker({
          map,
          position: new kakao.maps.LatLng(p.lat, p.lng),
        });
      });
    }
  }, [places]);

  return <div ref={mapRef} id="map" style={{ width: "100vw", height: "100vh" }} />;
}
