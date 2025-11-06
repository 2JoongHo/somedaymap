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
  const placeBtn = document.getElementById('placeBtn');
  const loginBtn = document.getElementById('loginBtn');
  const settingsBtn = document.getElementById('settingsBtn');
  const placeModal = document.getElementById('placeModal');
  const closeModal = document.getElementById('closeModal');

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

  // 내 장소 버튼 클릭 시
  placeBtn.addEventListener('click', () => {
    // this.alert("등록한 장소 목록을 불러옵니다.");
    placeModal.style.display = 'flex';
  });

  // 로그인 버튼 클릭 시
  loginBtn.addEventListener('click', () => {
    this.alert("로그인 기능은 곧 추가됩니다.");
    // 카카오/구글 로그인 연동 가능
  });

  // 설정 버튼 클릭 시
  settingsBtn.addEventListener('click', () => {
    this.alert("앱 설정창 열기");
  });

  // 배경 클릭 시 닫기
  placeModal.addEventListener('click', (e) => {
    if (e.target === placeModal) {
      placeModal.style.display = 'none';
    }
  });

  // 닫기 버튼 클릭 시 닫기
  closeModal.addEventListener('click', () => {
    placeModal.style.display = 'none';
  });

  // 지도 클릭 시 마커와 정보창 표시
  kakao.maps.event.addListener(map, 'click', function (mouseEvent) {
    const latlng = mouseEvent.latLng;

    // 클릭한 위치에 마커 추가
    const marker = new kakao.maps.Marker({
      position: latlng
    });
    marker.setMap(map);

    // 클릭한 좌표 표시용 인포윈도우
    const infowindow = new kakao.maps.InfoWindow({
      content: `<div style="padding:5px;">위도: ${latlng.getLat().toFixed(6)}<br>경도: ${latlng.getLng().toFixed(6)}</div>`
    });
    infowindow.open(map, marker);
  });

};
  