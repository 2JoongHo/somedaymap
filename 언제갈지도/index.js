// 페이지가 로드되면 실행
window.onload = function () {
    // 지도를 표시할 div
    const container = document.getElementById('map');
  
    // 지도 옵션 (망포역)
    const options = {
      center: new kakao.maps.LatLng(37.245833, 127.056667),
      level: 3
    };
  
    // 지도 생성
    const map = new kakao.maps.Map(container, options);
  
    // 버튼 이벤트
    const addBtn = document.getElementById('addPlaceBtn');
    const placeInput = document.getElementById('placeName');
  
    addBtn.addEventListener('click', () => {
      const name = placeInput.value.trim();
      if (!name) {
        alert('장소 이름을 입력해주세요!');
        return;
      }
  
      // 지도 중심에 마커 추가
      const markerPosition = map.getCenter();
      const marker = new kakao.maps.Marker({ position: markerPosition });
      marker.setMap(map);
  
      // 정보창 표시
      const infowindow = new kakao.maps.InfoWindow({
        content: `<div style="padding:5px;">${name}</div>`
      });
      infowindow.open(map, marker);
  
      placeInput.value = '';
    });
  };
  