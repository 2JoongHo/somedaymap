// 🌍 페이지가 로드되면 실행
window.onload = function () {
  const container = document.getElementById('map');

  // 기본 지도 옵션 (망포역 기준)
  const defaultCenter = new kakao.maps.LatLng(37.245833, 127.056667);
  const map = new kakao.maps.Map(container, {
    center: defaultCenter,
    level: 3
  });

  // 전역에서 관리될 장소 데이터를 담을 배열
  let userPlaces = [];
  // 현재 지도에 표시된 마커들을 관리할 배열
  const currentMarkers = []; // 'markers'와 겹치지 않게 이름 변경

  /* ✨ localStorage 관련 헬퍼 함수들 ✨ */
  // 고유 ID 생성 함수
  function generateUniqueId() {
    return 'place_' + Date.now() + Math.random().toString(36).substr(2, 9);
  }

  // localStorage에서 장소 불러오기
  function loadPlacesFromLocalStorage() {
    const storedPlaces = localStorage.getItem('언제갈지도_places');
    if (storedPlaces) {
      userPlaces = JSON.parse(storedPlaces);
      console.log('localStorage에서 불러온 장소:', userPlaces);
    } else {
      userPlaces = [];
    }
  }

  // localStorage에 장소 저장하기
  function savePlacesToLocalStorage() {
    localStorage.setItem('언제갈지도_places', JSON.stringify(userPlaces));
    console.log('localStorage에 장소 저장됨:', userPlaces);
  }

  /* ✨ 지도에 마커 표시 및 관리 ✨ */
  // 모든 마커 지우기
  function clearMarkers() {
    for (let i = 0; i < currentMarkers.length; i++) {
      currentMarkers[i].setMap(null);
    }
    currentMarkers.length = 0; // 배열 비우기
  }

  // 장소 데이터 기반으로 지도에 마커 표시하기
  function displayPlacesOnMap() {
    clearMarkers(); // 기존 마커 모두 지우기

    userPlaces.forEach(place => {
      const latlng = new kakao.maps.LatLng(place.lat, place.lng);
      const marker = new kakao.maps.Marker({ position: latlng });
      marker.setMap(map);
      currentMarkers.push(marker); // 마커 배열에 추가

      const infowindow = new kakao.maps.InfoWindow({
        content: `<div style="padding:5px; white-space: nowrap;">${place.name}</div>`
      });
      // 마커 클릭 시 정보창 열기
      kakao.maps.event.addListener(marker, 'click', () => {
        infowindow.open(map, marker);
      });
    });
  }

  /* ✨ '내 장소 목록' 모달 UI 업데이트 ✨ */
  function renderPlaceListInModal() {
    const placeListUl = document.getElementById('placeList');
    placeListUl.innerHTML = ''; // 기존 목록 초기화

    if (userPlaces.length === 0) {
      const noPlaceLi = document.createElement('li');
      noPlaceLi.textContent = '등록된 장소가 없습니다.';
      noPlaceLi.id = 'no-places-message'; // CSS 스타일을 적용하기 위한 ID 부여 (옵션)
      placeListUl.appendChild(noPlaceLi);
      return;
    }

    userPlaces.forEach(place => {
      const listItem = document.createElement('li');
      listItem.setAttribute('data-id', place.id); // 삭제를 위해 고유 ID 저장
      listItem.innerHTML = `
        <span>${place.name}</span>
        <button class="delete-place-btn" data-id="${place.id}">삭제</button>
      `;
      placeListUl.appendChild(listItem);
    });

    // 삭제 버튼 이벤트 리스너 추가
    // 모든 삭제 버튼에 이벤트를 다시 연결해야 하므로 querySelectorAll 사용
    document.querySelectorAll('.delete-place-btn').forEach(button => {
      button.onclick = (e) => { // 'click' 대신 'onclick'도 가능하지만 addEventListener가 더 일반적입니다.
        const placeIdToDelete = e.target.getAttribute('data-id');
        deletePlace(placeIdToDelete);
      };
    });
  }

  // 장소 삭제 함수
  function deletePlace(idToDelete) {
    userPlaces = userPlaces.filter(place => place.id !== idToDelete);
    savePlacesToLocalStorage(); // localStorage 업데이트
    displayPlacesOnMap(); // 지도 마커 업데이트
    renderPlaceListInModal(); // 모달 목록 업데이트
  }

  /* 📍 1️⃣ 사용자 현재 위치 불러오기 */
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      function (position) {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        const userPosition = new kakao.maps.LatLng(lat, lng);
        map.setCenter(userPosition);
      },
      function () {
        console.warn('⚠️ 위치 정보를 가져올 수 없습니다. 기본 위치로 설정됩니다.');
      }
    );
  } else {
    console.warn('⚠️ 이 브라우저는 Geolocation을 지원하지 않습니다.');
  }

  // 페이지 로드 시 localStorage에서 장소 불러와 지도에 표시
  loadPlacesFromLocalStorage();
  displayPlacesOnMap();
  // 초기 로드 시에는 모달을 열지 않으므로 renderPlaceListInModal() 호출하지 않음
  // placeBtn 클릭 시 호출됩니다.

  // 🎛️ 버튼 요소 불러오기
  const placeBtn = document.getElementById('placeBtn');
  const loginBtn = document.getElementById('loginBtn');
  const settingsBtn = document.getElementById('settingsBtn');
  const placeModal = document.getElementById('placeModal');
  const closeModal = document.getElementById('closeModal');

  // 메뉴 버튼 클릭 이벤트
  if (placeBtn) {
    placeBtn.addEventListener('click', () => {
      console.log('placeBtn 클릭됨! 모달을 엽니다.');
      if (placeModal) {
        placeModal.style.display = 'flex';
        renderPlaceListInModal(); // 모달 열릴 때마다 목록을 최신화합니다.
      } else {
        console.error('placeModal 요소를 찾을 수 없습니다.');
      }
    });
  } else {
    console.error('placeBtn 요소를 찾을 수 없습니다.');
  }
  
  if (loginBtn) {
    loginBtn.addEventListener('click', () => alert("로그인 기능은 곧 추가됩니다."));
  }
  if (settingsBtn) {
    settingsBtn.addEventListener('click', () => alert("앱 설정창 열기"));
  }

  // 모달 닫기 이벤트
  if (closeModal) {
    closeModal.addEventListener('click', () => {
      console.log('closeModal 클릭됨! 모달을 닫습니다.');
      if (placeModal) {
        placeModal.style.display = 'none';
      }
    });
  }

  // 모달 바깥 영역 클릭 시 모달 닫기
  if (placeModal) {
    placeModal.addEventListener('click', e => {
      if (e.target === placeModal) { // 클릭된 요소가 모달 배경일 경우
        console.log('모달 바깥 영역 클릭됨! 모달을 닫습니다.');
        placeModal.style.display = 'none';
      }
    });
  }


  /* 🧭 2️⃣ 지오코더 객체 생성 (좌표 → 주소 변환) */
  const geocoder = new kakao.maps.services.Geocoder();
  /* 🗺️ 3️⃣ 장소 검색 객체 생성 */
  const ps = new kakao.maps.services.Places(); // Places 객체 이름 변경

  /* 👆 좌클릭 시: 좌표 콘솔 출력 */
  kakao.maps.event.addListener(map, 'click', function (mouseEvent) {
    const latlng = mouseEvent.latLng;
    console.log(`좌클릭 → 위도: ${latlng.getLat()}, 경도: ${latlng.getLng()}`);
  });

  /* 🖱️ 우클릭 시: 지도에 표시된 장소 정보 가져와 마커 표시 및 localStorage에 저장 */
  kakao.maps.event.addListener(map, 'rightclick', function (mouseEvent) {
    const latlng = mouseEvent.latLng;
    let defaultName = "새로운 장소";

    // 1단계: 주변의 장소를 키워드 없이 검색 (가장 일반적인 POI 검색)
    ps.keywordSearch('', (data, status) => {
      console.log('keywordSearch 결과:', data, status);

      if (status === kakao.maps.services.Status.OK && data.length > 0) {
        defaultName = data[0].place_name;
        console.log('가장 가까운 POI 이름:', defaultName);

        const genericKeywords = ['빌딩', '도로', '아파트', '주택', '건물', '입구', '정류장', '교차로'];
        if (genericKeywords.some(keyword => defaultName.includes(keyword))) {
          console.log('검색된 POI 이름이 일반적이므로, 주소 검색을 시도합니다.');
          defaultName = "새로운 장소";
        }
      } else {
        console.log('keywordSearch로 상호명 검색 실패. 주소 검색을 시도합니다.');
      }

      // 2단계: 상호명을 찾지 못했거나 일반적인 상호명이라면, 지오코더로 주소 변환 후 장소 이름으로 사용
      if (defaultName === "새로운 장소") {
        geocoder.coord2Address(latlng.getLng(), latlng.getLat(), function (result, status) {
          if (status === kakao.maps.services.Status.OK) {
            defaultName =
              result[0].road_address?.address_name ||
              result[0].address?.address_name ||
              "새로운 장소";
            console.log('geocoder로 찾은 주소:', defaultName);
          } else {
            console.log('geocoder로도 주소 검색 실패.');
          }
          promptAndAddMarkerAndSave(latlng, defaultName);
        });
      } else {
        promptAndAddMarkerAndSave(latlng, defaultName);
      }
    }, {
      location: latlng, // 클릭한 위도, 경도
      radius: 50, // 반경 50미터 이내 검색
      size: 1 // 검색 결과는 1개만 받음 (가장 가까운 것)
    });
  });

  // 장소 이름 입력 후 마커를 지도에 추가하고 localStorage에 저장하는 함수
  function promptAndAddMarkerAndSave(latlng, initialName) {
    const placeName = prompt("이 장소의 이름을 입력하세요:", initialName);

    if (placeName && placeName.trim() !== "") {
      const newPlace = {
        id: generateUniqueId(), // 고유 ID 생성
        name: placeName,
        lat: latlng.getLat(),
        lng: latlng.getLng()
      };

      userPlaces.push(newPlace); // 배열에 추가
      savePlacesToLocalStorage(); // localStorage에 저장

      // 지도와 모달 UI 업데이트
      displayPlacesOnMap();
      renderPlaceListInModal(); // 장소가 추가되면 모달 목록도 바로 업데이트 (모달이 열려있다면)
      
      console.log(`새 장소 등록 및 저장 완료: ${placeName}`);
    }
  }
};