// 🌍 페이지가 로드되면 실행
window.onload = function () {
  const container = document.getElementById('map');

  // 기본 지도 옵션 (망포역 기준)
  const defaultCenter = new kakao.maps.LatLng(37.245833, 127.056667);
  const map = new kakao.maps.Map(container, {
    center: defaultCenter,
    level: 3
  });

  let myLocationOverlay = null; 
  let userPlaces = [];
  const currentMarkers = [];
  let isInitialCenterSet = false;

    // 🎛️ 버튼 요소 불러오기
  const menuToggleButton = document.getElementById('menuToggleButton');
  const mainMenu = document.getElementById('mainMenu');
  const placeBtn = document.getElementById('placeBtn');
  const loginBtn = document.getElementById('loginBtn');
  const settingsBtn = document.getElementById('settingsBtn');
  const placeModal = document.getElementById('placeModal');
  const closeModal = document.getElementById('closeModal');
  const moveToCurrentLocationBtn = document.getElementById('moveToCurrentLocationBtn'); // '내 위치로 이동' 버튼

  /* ✨ 거리 계산 헬퍼 함수 (하버사인 공식) ✨ */
  function getDistance(lat1, lon1, lat2, lon2) {
    const R = 6371e3;
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }

  /* ✨ localStorage 관련 헬퍼 함수들 ✨ */
  function generateUniqueId() {
    return 'place_' + Date.now() + Math.random().toString(36).substr(2, 9);
  }

  function loadPlacesFromLocalStorage() {
    const storedPlaces = localStorage.getItem('언제갈지도_places');
    if (storedPlaces) {
      userPlaces = JSON.parse(storedPlaces);
      userPlaces.forEach(place => place.isEntered = false); 
      console.log('localStorage에서 불러온 장소:', userPlaces);
    } else {
      userPlaces = [];
    }
  }

  function savePlacesToLocalStorage() {
    const placesToSave = userPlaces.map(({ id, name, lat, lng, radius }) => ({ id, name, lat, lng, radius }));
    localStorage.setItem('언제갈지도_places', JSON.stringify(placesToSave));
    console.log('localStorage에 장소 저장됨:', userPlaces);
  }

  /* ✨ 지도에 마커 표시 및 관리 ✨ */
  function clearMarkers() {
    for (let i = 0; i < currentMarkers.length; i++) {
      currentMarkers[i].setMap(null);
    }
    currentMarkers.length = 0;
  }

  function displayPlacesOnMap() {
    clearMarkers();

    userPlaces.forEach(place => {
      const latlng = new kakao.maps.LatLng(place.lat, place.lng);
      const marker = new kakao.maps.Marker({ position: latlng });
      marker.setMap(map);
      currentMarkers.push(marker);

      const infowindow = new kakao.maps.InfoWindow({
        content: `<div style="padding:5px; white-space: nowrap;">${place.name}</div>`
      });
      kakao.maps.event.addListener(marker, 'click', () => {
        infowindow.open(map, marker);
      });
    });
  }

  /* ✨ '내 장소 목록' 모달 UI 업데이트 ✨ */
  function renderPlaceListInModal() {
    const placeListUl = document.getElementById('placeList');
    placeListUl.innerHTML = '';

    if (userPlaces.length === 0) {
      const noPlaceLi = document.createElement('li');
      noPlaceLi.textContent = '등록된 장소가 없습니다.';
      noPlaceLi.id = 'no-places-message';
      placeListUl.appendChild(noPlaceLi);
      return;
    }

    userPlaces.forEach(place => {
      const listItem = document.createElement('li');
      listItem.setAttribute('data-id', place.id);
      listItem.innerHTML = `
        <span>${place.name}</span>
        <button class="delete-place-btn" data-id="${place.id}">삭제</button>
      `;
      placeListUl.appendChild(listItem);
    });

    document.querySelectorAll('.delete-place-btn').forEach(button => {
      button.onclick = (e) => {
        const placeIdToDelete = e.target.getAttribute('data-id');
        deletePlace(placeIdToDelete);
      };
    });
  }

  function deletePlace(idToDelete) {
    userPlaces = userPlaces.filter(place => place.id !== idToDelete);
    savePlacesToLocalStorage();
    displayPlacesOnMap();
    renderPlaceListInModal();
  }

  /* ✨✨✨ 웹 알림 권한 요청 및 알림 띄우는 함수 ✨✨✨ */
  function requestNotificationPermission() {
    if ('Notification' in window) { // 브라우저가 Notification API를 지원하는지 확인
      Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
          console.log('🔔 알림 권한이 허용되었습니다.');
        } else {
          console.warn('🔕 알림 권한이 거부되었습니다. 알림을 받을 수 없습니다.');
        }
      });
    } else {
      console.warn('⚠️ 이 브라우저는 웹 알림을 지원하지 않습니다.');
    }
  }

  function showNotification(title, body) {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, { body: body, icon: '../src/assets/icon/logo5.svg' }); // 알림 아이콘은 로고 이미지 사용
    } else if (Notification.permission !== 'denied') {
      // 권한이 거부된 상태가 아니라면 다시 요청해볼 수 있음
      console.warn('알림 권한이 아직 없거나 거부되지 않았습니다. 권한을 먼저 요청합니다.');
      requestNotificationPermission(); // 알림을 보내려 할 때 권한이 없으면 다시 요청
    }
  }

  /* 사용자 현재 위치 불러오기 (watchPosition) */
  if (navigator.geolocation) {
    // 페이지 로드 시 알림 권한 요청
    requestNotificationPermission();

    navigator.geolocation.watchPosition(
      function (position) {
        const currentLat = position.coords.latitude;
        const currentLng = position.coords.longitude;
        const userPosition = new kakao.maps.LatLng(currentLat, currentLng);
        map.setCenter(userPosition);

        console.log(`✅ 현재 위치: ${currentLat}, ${currentLng} (정확도: ${position.coords.accuracy}m)`);

        if (myLocationOverlay) {
            myLocationOverlay.setPosition(userPosition);
        } else {
            myLocationOverlay = new kakao.maps.CustomOverlay({
                map: map,
                position: userPosition,
                content: '<div class="my-location-dot"></div>',
                zIndex: 100
            }); 
        }

        userPlaces.forEach(place => {
          const distance = getDistance(currentLat, currentLng, place.lat, place.lng); // 미터 단위

          if (distance <= place.radius) {
            if (!place.isEntered) {
              const notificationTitle = `🚨 ${place.name}에 도착!`;
              const notificationBody = `설정하신 ${place.name}의 반경 ${place.radius}m 내에 진입했습니다! 현재 ${distance.toFixed(1)}m`;
              console.log(notificationBody); // 콘솔에도 계속 출력
              showNotification(notificationTitle, notificationBody); // ✨✨✨ 웹 알림 호출 ✨✨✨
              place.isEntered = true;
            }
          } else {
            if (place.isEntered) {
              const notificationTitle = `ℹ️ ${place.name} 이탈`;
              const notificationBody = `설정하신 ${place.name}의 반경 ${place.radius}m를 벗어났습니다. 현재 ${distance.toFixed(1)}m`;
              console.log(notificationBody); // 콘솔에도 계속 출력
              // 벗어날 때도 알림을 보내고 싶다면 아래 showNotification 주석 해제
              // showNotification(notificationTitle, notificationBody);
              place.isEntered = false;
            }
          }
        });
      },
      function (error) {
        console.warn('⚠️ 위치 정보를 지속적으로 가져올 수 없습니다. 기본 위치로 설정됩니다.');
        console.error('위치 정보 오류 코드:', error.code);
        console.error('위치 정보 오류 메시지:', error.message);

        if (myLocationOverlay) {
            myLocationOverlay.setMap(null);
            myLocationOverlay = null;
        }

        switch (error.code) {
          case error.PERMISSION_DENIED:
            console.error('사용자가 위치 정보 사용을 거부했습니다. (PERMISSION_DENIED) - 위치 추적이 중단됩니다.');
            break;
          case error.POSITION_UNAVAILABLE:
            console.error('위치 정보를 사용할 수 없습니다. (POSITION_UNAVAILABLE) - GPS/Wi-Fi 신호 문제일 수 있습니다. 위치 추적이 중단됩니다.');
            break;
          case error.TIMEOUT:
            console.error('위치 정보를 가져오는 요청이 시간 초과되었습니다. (TIMEOUT) - 위치 추적이 중단됩니다.');
            break;
          case error.UNKNOWN_ERROR:
            console.error('알 수 없는 위치 정보 오류가 발생했습니다. (UNKNOWN_ERROR) - 위치 추적이 중단됩니다.');
            break;
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0
      }
    );
  } else {
    console.warn('⚠️ 이 브라우저는 Geolocation을 지원하지 않습니다.');
  }

  loadPlacesFromLocalStorage();
  displayPlacesOnMap();


  if (menuToggleButton && mainMenu) {
    menuToggleButton.addEventListener('click', (e) => {
      e.stopPropagation();
      mainMenu.classList.toggle('show');
      if (mainMenu.classList.contains('show')) {
        mainMenu.style.display = 'block';
      } else {
        setTimeout(() => {
          if (!mainMenu.classList.contains('show')) {
            mainMenu.style.display = 'none';
          }
        }, 300);
      }
    });
  }

  document.addEventListener('click', (e) => {
    if (mainMenu && mainMenu.classList.contains('show')) {
      if (!mainMenu.contains(e.target) && e.target !== menuToggleButton && !menuToggleButton.contains(e.target)) {
        mainMenu.classList.remove('show');
        mainMenu.style.display = 'none';
      }
    }
  });

  if (placeBtn) {
    placeBtn.addEventListener('click', () => {
      console.log('placeBtn 클릭됨! 모달을 엽니다.');
      if (placeModal) {
        if (mainMenu) { mainMenu.classList.remove('show'); mainMenu.style.display = 'none'; }
        placeModal.style.display = 'flex';
        renderPlaceListInModal();
      } else {
        console.error('placeModal 요소를 찾을 수 없습니다.');
      }
    });
  }
  if (loginBtn) {
    loginBtn.addEventListener('click', () => {
      if (mainMenu) { mainMenu.classList.remove('show'); mainMenu.style.display = 'none'; }
      alert("로그인 기능은 곧 추가됩니다.");
    });
  }
  if (settingsBtn) {
    settingsBtn.addEventListener('click', () => {
      if (mainMenu) { mainMenu.classList.remove('show'); mainMenu.style.display = 'none'; }
      alert("앱 설정창 열기");
    });
  }

  if (closeModal) {
    closeModal.addEventListener('click', () => {
      console.log('closeModal 클릭됨! 모달을 닫습니다.');
      if (placeModal) {
        placeModal.style.display = 'none';
      }
    });
  }
  if (placeModal) {
    placeModal.addEventListener('click', e => {
      if (e.target === placeModal) {
        console.log('모달 바깥 영역 클릭됨! 모달을 닫습니다.');
        placeModal.style.display = 'none';
      }
    });
  }

  /* 🧭 2️⃣ 지오코더 객체 생성 (좌표 → 주소 변환) */
  const geocoder = new kakao.maps.services.Geocoder();
  /* 🗺️ 3️⃣ 장소 검색 객체 생성 */
  const ps = new kakao.maps.services.Places();

  /* 👆 좌클릭 시: 좌표 콘솔 출력 */
  kakao.maps.event.addListener(map, 'click', function (mouseEvent) {
    const latlng = mouseEvent.latLng;
    console.log(`좌클릭 → 위도: ${latlng.getLat()}, 경도: ${latlng.getLng()}`);
  });

  /* 🖱️ 우클릭 시: 지도에 표시된 장소 정보 가져와 마커 표시 및 localStorage에 저장 */
  kakao.maps.event.addListener(map, 'rightclick', function (mouseEvent) {
    const latlng = mouseEvent.latLng;
    let defaultName = "새로운 장소";

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
      location: latlng,
      radius: 50,
      size: 1
    });
  });

  // 장소 이름과 반경 입력 후 마커를 지도에 추가하고 localStorage에 저장하는 함수
  function promptAndAddMarkerAndSave(latlng, initialName) {
    const placeName = prompt("이 장소의 이름을 입력하세요:", initialName);
    if (!placeName || placeName.trim() === "") return;

    let radius = parseInt(prompt("알림 반경을 미터 단위로 입력하세요 (기본값: 50m):", "50"));
    if (isNaN(radius) || radius <= 0) {
      radius = 50;
    }

    const newPlace = {
      id: generateUniqueId(),
      name: placeName,
      lat: latlng.getLat(),
      lng: latlng.getLng(),
      radius: radius,
      isEntered: false
    };

    userPlaces.push(newPlace);
    savePlacesToLocalStorage();
    displayPlacesOnMap();
    
    console.log(`새 장소 등록 및 저장 완료: ${placeName}, 반경: ${radius}m`);
  }
};