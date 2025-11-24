// 🌍 페이지가 로드되면 실행
window.onload = function () {
  const container = document.getElementById('map');

  // 기본 지도 옵션 (망포역 기준)
  // 지도 초기화 시 defaultCenter를 사용하며, 레벨은 3으로 설정
  const defaultCenter = new kakao.maps.LatLng(37.245833, 127.056667);
  const map = new kakao.maps.Map(container, {
    center: defaultCenter,
    level: 3
  });

  // 내 현재 위치를 표시할 CustomOverlay 변수 선언 (지도 확대/축소 시 크기 고정)
  let myLocationOverlay = null;

  // 전역에서 관리될 장소 데이터를 담을 배열
  let userPlaces = [];
  // 현재 지도에 표시된 마커들을 관리할 배열
  const currentMarkers = [];
  // `isInitialCenterSet` 플래그는 사용되지 않아 제거했습니다. 지도는 watchPosition에 따라 계속 움직입니다.

  // 현재 지도에 표시된 반경 원 객체
  let currentRadiusCircle = null; 

  // 지도에 열려 있는 인포윈도우 객체
  let currentOpenInfowindow = null; 

  // 🎛️ 주요 DOM 요소들을 미리 가져오기
  const menuToggleButton = document.getElementById('menuToggleButton');
  // const mainMenu = document.getElementById('mainMenu');
  const mainMenu = document.querySelector('nav.main-menu');
  const placeBtn = document.getElementById('placeBtn');
  const loginBtn = document.getElementById('loginBtn');
  const settingsBtn = document.getElementById('settingsBtn');
  const placeModal = document.getElementById('placeModal');
  const closeModal = document.getElementById('closeModal');
  const settingsModal = document.getElementById('settingsModal');
  const closeSettingsModal = document.getElementById('closeSettingsModal');
  // '내 위치로 이동' 버튼
  const moveToCurrentLocationBtn = document.getElementById('moveToCurrentLocationBtn');
  const openSearchModalBtn = document.getElementById('openSearchModalBtn');
  const searchModal = document.getElementById('searchModal');
  const closeSearchModal = document.getElementById('closeSearchModal');
  const keywordInput = document.getElementById('keyword');
  const searchBtn = document.getElementById('searchBtn');
  const searchResultsList = document.getElementById('searchResultsList')


  /* =========================================================
   *  [1] 헬퍼 함수 정의: 거리 계산, LocalStorage, UI 렌더링, 알림
   * ========================================================= */

  /**
   * 두 위도, 경도 좌표 간의 거리를 미터 단위로 계산합니다 (하버사인 공식).
   * @param {number} lat1 - 첫 번째 지점의 위도
   * @param {number} lon1 - 첫 번째 지점의 경도
   * @param {number} lat2 - 두 번째 지점의 위도
   * @param {number} lon2 - 두 번째 지점의 경도
   * @returns {number} 두 지점 사이의 거리 (미터)
   */
  function getDistance(lat1, lon1, lat2, lon2) {
    const R = 6371e3; // 지구의 반지름 (미터)
    const φ1 = lat1 * Math.PI / 180; // φ, λ는 위도/경도를 라디안으로 변환
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180; // 위도 차이
    const Δλ = (lon2 - lon1) * Math.PI / 180; // 경도 차이

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // 미터 단위 거리 반환
  }

  /**
   * 고유 ID를 생성합니다.
   * @returns {string} 고유 ID 문자열
   */
  function generateUniqueId() {
    return 'place_' + Date.now() + Math.random().toString(36).substr(2, 9);
  }

  /**
   * localStorage에서 저장된 장소 목록을 불러옵니다.
   * 각 장소의 'isEntered' 상태는 세션 시작 시 초기화됩니다.
   */
  function loadPlacesFromLocalStorage() {
    const storedPlaces = localStorage.getItem('언제갈지도_places');
    if (storedPlaces) {
      userPlaces = JSON.parse(storedPlaces);
      // isEntered 플래그는 매 세션 시작 시 초기화 (새로운 접근으로 간주)
      userPlaces.forEach(place => place.isEntered = false);
      console.log('localStorage에서 불러온 장소:', userPlaces);
    } else {
      userPlaces = [];
    }
  }

  /**
   * 현재 장소 목록(userPlaces)을 localStorage에 저장합니다.
   * 'isEntered' 플래그는 저장하지 않습니다.
   */
  function savePlacesToLocalStorage() {
    // isEntered 플래그는 세션별로 초기화되므로 localStorage에는 저장하지 않음
    const placesToSave = userPlaces.map(({ id, name, lat, lng, radius }) => ({ id, name, lat, lng, radius }));
    localStorage.setItem('언제갈지도_places', JSON.stringify(placesToSave));
    console.log('localStorage에 장소 저장됨:', userPlaces);
  }

  /**
   * 지도에 표시된 모든 마커를 지우고 배열을 비웁니다.
   */
  function clearMarkers() {
    for (let i = 0; i < currentMarkers.length; i++) {
      currentMarkers[i].setMap(null);
    }
    currentMarkers.length = 0;
  }

  /**
   * userPlaces 배열의 장소들을 지도에 마커로 표시합니다.
   */
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
      // 마커 클릭 시 인포윈도우 표시
      kakao.maps.event.addListener(marker, 'click', () => {
        if (currentOpenInfowindow) {
          currentOpenInfowindow.close();
        }
        infowindow.open(map, marker);
        currentOpenInfowindow = infowindow;
      });
    });
  }

  /**
   * '내 장소 목록' 모달 UI를 userPlaces 데이터로 업데이트합니다.
   */
  function renderPlaceListInModal() {
    const placeListUl = document.getElementById('placeList');
    placeListUl.innerHTML = ''; // 기존 목록 초기화

    if (userPlaces.length === 0) {
      const noPlaceLi = document.createElement('li');
      noPlaceLi.textContent = '언젠가 가보고 싶은 곳을 찍어보세요!';
      noPlaceLi.id = 'no-places-message'; // CSS 스타일링을 위한 ID
      placeListUl.appendChild(noPlaceLi);
      return;
    }

    userPlaces.forEach(place => {
      const listItem = document.createElement('li');
      listItem.setAttribute('data-id', place.id); // 장소 ID를 data 속성으로 저장
      // 장소 이름만 표시 (반경 정보는 UI에 표시 안 함)
      listItem.innerHTML = `
        <span>${place.name}</span>
        <button class="delete-place-btn" data-id="${place.id}">삭제</button>
      `;
      placeListUl.appendChild(listItem);

      const placeNameSpan = listItem.querySelector('span'); // 장소 이름이 있는 span을 클릭 가능하게
      if (placeNameSpan) {
        placeNameSpan.style.cursor = 'pointer'; // 클릭 가능한 것처럼 보이게 커서 변경
        placeNameSpan.onclick = () => { // 클릭 시 지도 이동 함수 호출
          moveMapToPlace(place.id);
        };
      }
    });

    // 삭제 버튼에 이벤트 리스너 추가
    document.querySelectorAll('.delete-place-btn').forEach(button => {
      button.onclick = (e) => {
        const placeIdToDelete = e.target.getAttribute('data-id');
        deletePlace(placeIdToDelete);
      };
    });
  }

    // 지도 이동 및 모달 닫기
  function moveMapToPlace(placeId) {
    const foundPlace = userPlaces.find(place => place.id === placeId);
    if (foundPlace) {
      const latlng = new kakao.maps.LatLng(foundPlace.lat, foundPlace.lng);
      map.setCenter(latlng); // 지도를 해당 장소의 위치로 이동
      console.log(`'${foundPlace.name}'(으)로 지도를 이동했습니다.`);
      
      // 모달이 열려 있다면 닫기
      if (placeModal && placeModal.style.display === 'flex') {
        placeModal.style.display = 'none';
      }
    } else {
      console.warn(`ID ${placeId}를 가진 장소를 찾을 수 없습니다.`);
    }
  }

  /**
   * 지정된 ID의 장소를 userPlaces에서 삭제하고 localStorage 및 UI를 업데이트합니다.
   * @param {string} idToDelete - 삭제할 장소의 고유 ID
   */
  function deletePlace(idToDelete) {
    userPlaces = userPlaces.filter(place => place.id !== idToDelete);
    savePlacesToLocalStorage();
    displayPlacesOnMap(); // 지도 마커 업데이트
    renderPlaceListInModal(); // 모달 목록 업데이트
  }

  /**
   * 웹 알림 권한을 요청합니다.
   */
  function requestNotificationPermission() {
    // Notification API 지원 여부 확인
    if ('Notification' in window) {
      Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
          console.log('🔔 알림 권한이 허용되었습니다.');
        } else if (permission === 'denied') {
          console.warn('🔕 알림 권한이 영구적으로 거부되었습니다. 알림을 받을 수 없습니다.');
        } else { // 'default' (사용자가 아직 응답 안 함)
          console.warn('🔕 알림 권한이 아직 허용되지 않았습니다.');
        }
      });
    } else {
      console.warn('⚠️ 이 브라우저는 웹 알림을 지원하지 않습니다.');
    }
  }

  /**
   * 웹 알림 팝업을 띄웁니다.
   * @param {string} title - 알림 제목
   * @param {string} body - 알림 내용
   */
  function showNotification(title, body) {
    if ('Notification' in window && Notification.permission === 'granted') {
      // 로고 이미지 경로를 알림 아이콘으로 사용
      new Notification(title, { body: body, icon: '../src/assets/icon/logo5.svg' });
    } else if (Notification.permission !== 'denied') {
      // 권한이 없지만 거부된 상태가 아니라면 다시 요청해볼 수 있음
      console.warn('알림 권한이 없어서 알림을 보낼 수 없습니다. 권한을 먼저 요청합니다.');
      // 선택적으로 requestNotificationPermission(); 을 다시 호출할 수 있으나,
      // 페이지 로드 시 한 번만 요청하는 것이 일반적
    }
  }


  /* =========================================================
   *  [2] 주요 기능 로직: 위치 감지, 지오펜싱, 지도 상호작용
   * ========================================================= */

  // Geolocation API를 지원하는 경우
  if (navigator.geolocation) {
    // 페이지 로드 시 알림 권한 요청 (최초 1회)
    requestNotificationPermission();

    // 📍 사용자 현재 위치를 지속적으로 감지하고 업데이트 (Geofencing 용도)
    navigator.geolocation.watchPosition(
      // ✅ 위치 정보 가져오기 성공 시 콜백
      function (position) {
        const currentLat = position.coords.latitude;
        const currentLng = position.coords.longitude;
        const userPosition = new kakao.maps.LatLng(currentLat, currentLng);

        // watchPosition이 새 위치를 감지할 때마다 지도를 현재 위치로 계속 이동시킵니다.
        map.setCenter(userPosition);

        console.log(`✅ 현재 위치: ${currentLat}, ${currentLng} (정확도: ${position.coords.accuracy}m)`);

        // 내 위치 CustomOverlay 업데이트 또는 생성
        if (myLocationOverlay) {
          myLocationOverlay.setPosition(userPosition); // 위치만 업데이트
        } else {
          // CustomOverlay 생성: HTML div 요소를 지도 위에 띄움
          myLocationOverlay = new kakao.maps.CustomOverlay({
            map: map, // 지도에 올리기
            position: userPosition, // 내 위치 좌표
            content: '<div class="my-location-dot"></div>', // CSS 클래스가 적용된 HTML
            zIndex: 100 // 다른 마커보다 높은 Z-index로 항상 위에 보이도록
          });
        }

        // Geofencing 로직: 저장된 모든 장소에 대해 현재 위치와의 거리 확인
        userPlaces.forEach(place => {
          const distance = getDistance(currentLat, currentLng, place.lat, place.lng); // 미터 단위 거리 계산

          if (distance <= place.radius) {
            // 반경 안에 들어옴
            if (!place.isEntered) { // 이전에 반경 밖에 있다가 처음 진입했을 때만
              const notificationTitle = `🚨 ${place.name}에 도착!`;
              const notificationBody = `설정하신 ${place.name} 반경 ${place.radius}m 내에 진입했습니다! 현재 ${distance.toFixed(1)}m`;
              console.log(notificationBody);
              showNotification(notificationTitle, notificationBody); // 웹 알림 띄우기
              place.isEntered = true; // 진입 상태로 변경
            }
          } else {
            // 반경 밖에 있음
            if (place.isEntered) { // 반경 안에 있다가 처음 밖으로 나갔을 때만
              const notificationTitle = `ℹ️ ${place.name} 이탈`;
              const notificationBody = `설정하신 ${place.name} 반경 ${place.radius}m를 벗어났습니다. 현재 ${distance.toFixed(1)}m`;
              console.log(notificationBody);
              // 벗어날 때도 알림을 보내고 싶다면 아래 showNotification 주석 해제
              // showNotification(notificationTitle, notificationBody);
              place.isEntered = false; // 진입 상태 초기화
            }
          }
        });
      },
      // 위치 정보 가져오기 실패 시 콜백
      function (error) {
        console.warn('⚠️ 위치 정보를 지속적으로 가져올 수 없습니다.');
        console.error('위치 정보 오류 코드:', error.code);
        console.error('위치 정보 오류 메시지:', error.message);

        // 오류 발생 시 내 위치 CustomOverlay 제거 (선택 사항)
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
            console.error('알 수 없는 위치 정보 오류가 발생했습니다. (UNKNOWN_ERROR) - 알림 없이 지오펜싱 기능을 사용할 수 없습니다.');
            break;
        }
      },
      // watchPosition 옵션 설정: 고정밀, 타임아웃, 캐시 사용 안 함
      {
        enableHighAccuracy: true, // 고정밀 위치 요청 (배터리 소모 증가 가능)
        timeout: 15000,           // 15초 내에 위치 정보 못 가져오면 실패
        maximumAge: 0             // 캐시된 위치 사용 안 함 (항상 최신 위치 요청)
      }
    );
  } else {
    // Geolocation API를 지원하지 않는 브라우저인 경우
    console.warn('⚠️ 이 브라우저는 Geolocation을 지원하지 않습니다.');
    alert('이 브라우저는 위치 정보를 지원하지 않아 지오펜싱 기능을 사용할 수 없습니다.');
  }

  // 페이지 로드 시 저장된 장소 불러와 지도에 표시
  loadPlacesFromLocalStorage();
  displayPlacesOnMap();


  /* =========================================================
   *  [3] 이벤트 리스너: UI 상호작용
   * ========================================================= */

  // 메뉴 토글 버튼 이벤트 리스너 (클래스 토글 방식으로 애니메이션 적용)
  if (menuToggleButton && mainMenu) {
    menuToggleButton.addEventListener('click', (e) => {
      e.stopPropagation(); // 이벤트 버블링 방지
      mainMenu.classList.toggle('show'); // 'show' 클래스를 토글하여 CSS 애니메이션 발동
      if (mainMenu.classList.contains('show')) {
        mainMenu.style.display = 'block'; // 애니메이션을 위해 display:block으로 설정
      } else {
        // 애니메이션이 끝나면 display:none으로 완전히 숨김 (CSS transition 시간과 맞춰줌)
        setTimeout(() => {
          if (!mainMenu.classList.contains('show')) {
            mainMenu.style.display = 'none';
          }
        }, 300);
      }
    });
  }

  // 문서 어디든 클릭 시 드롭다운 메뉴 닫기
  document.addEventListener('click', (e) => {
    if (mainMenu && mainMenu.classList.contains('show')) {
      // 클릭된 요소가 메뉴 토글 버튼이나 메뉴 자체에 속하지 않으면 메뉴 닫기
      if (!mainMenu.contains(e.target) && e.target !== menuToggleButton && !menuToggleButton.contains(e.target)) {
        mainMenu.classList.remove('show');
        mainMenu.style.display = 'none'; // 완전히 숨김
      }
    }
  });


  // 메뉴 아이템(내 장소, 로그인, 설정) 클릭 이벤트
  if (placeBtn) {
    placeBtn.addEventListener('click', () => {
      console.log('placeBtn 클릭됨! 모달을 엽니다.');
      if (placeModal) {
        if (mainMenu) { mainMenu.classList.remove('show'); mainMenu.style.display = 'none'; } // 메뉴 닫기
        placeModal.style.display = 'flex'; // 모달 열기
        renderPlaceListInModal(); // 모달 내용 업데이트
      } else {
        console.error('placeModal 요소를 찾을 수 없습니다.');
      }
    });
  }
  if (loginBtn) {
    loginBtn.addEventListener('click', () => {
      if (mainMenu) { mainMenu.classList.remove('show'); mainMenu.style.display = 'none'; } // 메뉴 닫기
      alert("로그인 기능은 곧 추가됩니다.");
    });
  }
  if (settingsBtn) {
    settingsBtn.addEventListener('click', () => {
      if (mainMenu) { mainMenu.classList.remove('show'); mainMenu.style.display = 'none'; } // 메뉴 닫기
      if (settingsModal) {
        loadSettingsFromLocalStorage(); // 모달 열기 전에 최신 설정 불러와 UI에 적용
        settingsModal.style.display = 'flex'; // ✨✨✨ 설정 모달 열기 ✨✨✨
      } else {
        console.error('settingsModal 요소를 찾을 수 없습니다.');
      }
    });
  }

  // ✨✨✨ 새로 추가: 지도 위에 별도로 띄울 검색 버튼 클릭 이벤트 ✨✨✨
if (openSearchModalBtn) {
  openSearchModalBtn.addEventListener('click', (e) => {
    e.stopPropagation(); // 이벤트 버블링 방지 (혹시 모를 상위 요소 클릭 방지)
    if (searchModal) {
      searchModal.style.display = 'flex'; // ✨✨✨ 검색 모달 열기! ✨✨✨
      // 모달이 열리면 검색 input에 포커스 (사용자 편의성)
      // keywordInput 변수가 null이 아니라면 포커스 (HTML에 id="keyword" 요소가 있어야 함)
      if (keywordInput) keywordInput.focus();

      // 혹시 열려있는 메뉴 있으면 닫기 (UX 개선)
      if (mainMenu && mainMenu.classList.contains('show')) {
        mainMenu.classList.remove('show');
        mainMenu.style.display = 'none';
      }
    } else {
      console.error('searchModal 요소를 찾을 수 없습니다.'); // HTML에 searchModal id가 없는 경우
    }
  });
}

// 검색 버튼 클릭 시 찾기
searchBtn.addEventListener('click', () => {
  const keyword = keywordInput.value.trim();
  if (!keyword) return alert("검색어를 입력하세요!");

  const results = userPlaces.filter(place =>
    place.name.includes(keyword) || place.name.toLowerCase().includes(keyword.toLowerCase())
  );

  showSearchResults(results);
});

// 검색 결과를 모달에 표시
function showSearchResults(results) {
  const placeList = document.getElementById('placeList');

  placeList.innerHTML = ''; // 기존 내용 초기화

  if (results.length === 0) {
    placeList.innerHTML = `<li>검색 결과가 없습니다.</li>`;
    return;
  }

  results.forEach(place => {
    const li = document.createElement('li');
    li.innerHTML = `
      <span>${place.name}</span>
      <button class="delete-place-btn" data-id="${place.id}">삭제</button>
    `;

    // 클릭하면 지도 이동
    li.querySelector('span').onclick = () => moveMapToPlace(place.id);

    // 삭제
    li.querySelector('button').onclick = () => {
      deletePlace(place.id);
      showSearchResults(results.filter(r => r.id !== place.id)); // 결과 업데이트
    };

    placeList.appendChild(li);
  });
}

// ✨✨✨ 검색 모달 닫기 버튼 및 외부 영역 클릭 이벤트는 이전과 동일 ✨✨✨
if (closeSearchModal) {
  closeSearchModal.addEventListener('click', () => {
    console.log('closeSearchModal 클릭됨! 모달을 닫습니다.');
    if (searchModal) {
      searchModal.style.display = 'none';
      clearSearchResults(); // 모달 닫을 때 기존 검색 결과 마커/인포윈도우도 지움
      keywordInput.value = ''; // 검색창 내용도 지움
    }
  });
}
if (searchModal) {
  searchModal.addEventListener('click', e => {
    if (e.target === searchModal) { // 모달의 바깥 영역을 클릭했는지 확인
      console.log('검색 모달 바깥 영역 클릭됨! 모달을 닫습니다.');
      searchModal.style.display = 'none';
      clearSearchResults(); // 모달 닫을 때 기존 검색 결과 마커/인포윈도우도 지움
      keywordInput.value = ''; // 검색창 내용도 지움
    }
  });
}

  // ✨ 모달 닫기 버튼 및 외부 영역 클릭 이벤트
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
      if (e.target === placeModal) { // 모달의 바깥 영역을 클릭했는지 확인
        console.log('모달 바깥 영역 클릭됨! 모달을 닫습니다.');
        placeModal.style.display = 'none';
      }
    });
  }

  // '내 위치로 이동' 버튼 클릭 이벤트
  if (moveToCurrentLocationBtn) {
    moveToCurrentLocationBtn.addEventListener('click', () => {
      console.log('내 위치로 이동 버튼 클릭됨!');
      if (navigator.geolocation) {
        // watchPosition과 달리 getCurrentPosition은 1회성으로 현재 위치를 요청
        navigator.geolocation.getCurrentPosition(
          function (position) {
            const lat = position.coords.latitude;
            const lng = position.coords.longitude;
            const userPosition = new kakao.maps.LatLng(lat, lng);
            map.setCenter(userPosition); // 지도를 현재 위치로 이동
            console.log('지도 현재 위치로 이동 완료:', lat, lng);
          },
          function (error) {
            // 위치 정보를 가져오지 못했을 때 사용자에게 상세 안내
            let errorMessage = "내 위치를 가져올 수 없습니다. 브라우저/기기 위치 설정 및 권한을 확인해주세요.";
            switch (error.code) {
              case error.PERMISSION_DENIED:
                errorMessage = "사용자가 위치 정보 접근을 허용하지 않았습니다.";
                break;
              case error.POSITION_UNAVAILABLE:
                errorMessage = "위치 정보를 사용할 수 없습니다. (GPS 신호 불량, Wi-Fi 불안정 등)";
                break;
              case error.TIMEOUT:
                errorMessage = "위치 정보를 가져오는 요청이 시간 초과되었습니다.";
                break;
            }
            alert(errorMessage);
            console.error('내 위치로 이동 실패:', error);
          },
          // getCurrentPosition 옵션 설정
          {
            enableHighAccuracy: true,
            timeout: 15000, // 15초 내에 위치 정보 가져오지 못하면 실패
            maximumAge: 0
          }
        );
      } else {
        alert("이 브라우저는 Geolocation을 지원하지 않습니다.");
        console.warn('⚠️ 이 브라우저는 Geolocation을 지원하지 않습니다.');
      }
    });
  }

    // 새로 추가된 함수: 지도 이동 및 모달 닫기
  function moveMapToPlace(placeId) {
    const foundPlace = userPlaces.find(place => place.id === placeId);
    if (foundPlace) {
      const latlng = new kakao.maps.LatLng(foundPlace.lat, foundPlace.lng);
      map.setCenter(latlng); // 지도를 해당 장소의 위치로 이동
      console.log(`'${foundPlace.name}'(으)로 지도를 이동했습니다.`);
      
      // 이전 반경 원이 있다면 지도에서 제거
      if (currentRadiusCircle) {
        currentRadiusCircle.setMap(null);
        currentRadiusCircle = null; // null로 설정하여 참조 해제
      }

      // 새 반경 원 생성 및 지도에 표시
      currentRadiusCircle = new kakao.maps.Circle({
        map: map, // 지도 객체
        center: latlng, // 원의 중심 좌표
        radius: foundPlace.radius, // 원의 반지름 (미터 단위)
        strokeWeight: 2, // 선의 두께
        strokeColor: '#007BFF', // 선의 색깔 (파란색 계열)
        strokeOpacity: 0.8, // 선의 불투명도
        strokeStyle: 'solid', // 선의 스타일
        fillColor: '#007BFF', // 채우기 색깔
        fillOpacity: 0.2 // 채우기 불투명도
      });

      // 모달이 열려 있다면 닫기
      if (placeModal && placeModal.style.display === 'flex') {
        placeModal.style.display = 'none';
      }
    } else {
      console.warn(`ID ${placeId}를 가진 장소를 찾을 수 없습니다.`);
    }
  }


  /* =========================================================
   *  [4] 카카오 맵 서비스 및 추가 이벤트 리스너 (기존과 동일)
   * ========================================================= */

  // 지오코더 객체 생성 (좌표 → 주소 변환)
  const geocoder = new kakao.maps.services.Geocoder();
  // 장소 검색 객체 생성
  const ps = new kakao.maps.services.Places();

  // 좌클릭 시: 클릭한 위치의 위도/경도를 콘솔에 출력 (디버깅 용도)
  kakao.maps.event.addListener(map, 'click', function (mouseEvent) {
    const latlng = mouseEvent.latLng;
    console.log(`좌클릭 → 위도: ${latlng.getLat()}, 경도: ${latlng.getLng()}`);

    // 지도 빈 공간 클릭 시 인포윈도우 닫기 로직 추가
    // mouseEvent.overlay가 null이면 지도의 빈 공간을 클릭한 것
    // mouseEvent.overlayType이 'marker' 또는 'infowindow'가 아니라면
    if (currentOpenInfowindow && (!mouseEvent.overlay || mouseEvent.overlay.type !== 'marker')) {
        // mouseEvent.overlay를 통해 클릭된 객체가 마커인지 확인할 수 있지만
        // 인포윈도우 닫기는 마커 위 클릭이 아닌 경우 (지도 클릭 또는 다른 곳 클릭) 발생해야 함.
        // 현재 로직에서는 인포윈도우 자체 클릭 시에는 닫히지 않고,
        // 지도를 클릭하면 닫히도록 의도.
        currentOpenInfowindow.close();
        currentOpenInfowindow = null;
    }
  });

  // 우클릭 시: 지도에 표시된 장소 정보 가져와 마커 표시 및 localStorage에 저장
  kakao.maps.event.addListener(map, 'rightclick', function (mouseEvent) {
    const latlng = mouseEvent.latLng; // 우클릭한 위도, 경도
    let defaultName = "새로운 장소"; // 기본 장소 이름 초기화

    // 1. POI(관심 지점) 검색 (가장 가까운 상호명)
    ps.keywordSearch('', (data, status) => {
      console.log('keywordSearch 결과:', data, status);

      if (status === kakao.maps.services.Status.OK && data.length > 0) {
        defaultName = data[0].place_name; // 가장 가까운 POI 이름 사용
        console.log('가장 가까운 POI 이름:', defaultName);

        // 상호명이 '빌딩', '도로' 등 일반적인 경우, 주소 검색을 시도 (UX 개선)
        const genericKeywords = ['빌딩', '도로', '아파트', '주택', '건물', '입구', '정류장', '교차로', '지점', '타워'];
        if (genericKeywords.some(keyword => defaultName.includes(keyword)) || data[0].category_group_code === '') {
          console.log('검색된 POI 이름이 일반적이거나 카테고리가 없어, 주소 검색을 시도합니다.');
          defaultName = "새로운 장소"; // 주소로 찾기 위해 초기화
        }
      } else {
        console.log('keywordSearch로 상호명 검색 실패. 주소 검색을 시도합니다.');
      }

      // 2. POI 검색에 실패했거나 일반적인 POI 이름인 경우, 좌표를 주소로 변환하여 사용
      if (defaultName === "새로운 장소") {
        geocoder.coord2Address(latlng.getLng(), latlng.getLat(), function (result, status) {
          if (status === kakao.maps.services.Status.OK) {
            // 도로명 주소 또는 지번 주소 중 하나를 기본 이름으로 사용
            defaultName =
              result[0].road_address?.address_name ||
              result[0].address?.address_name ||
              "새로운 장소";
            console.log('geocoder로 찾은 주소:', defaultName);
          } else {
            console.log('geocoder로도 주소 검색 실패.');
          }
          promptAndAddMarkerAndSave(latlng, defaultName); // 사용자에게 이름/반경 입력 요청
        });
      } else {
        promptAndAddMarkerAndSave(latlng, defaultName); // 사용자에게 이름/반경 입력 요청
      }
    }, {
      location: latlng, // 우클릭한 위치 기준으로 검색
      radius: 50,      // 반경 50미터 이내에서 검색
      size: 1          // 최대 1개의 결과만 가져옴
    });
  });

  /**
   * 사용자에게 장소 이름과 알림 반경을 입력받아, 새 장소를 userPlaces에 추가하고 localStorage 및 UI를 업데이트합니다.
   * @param {kakao.maps.LatLng} latlng - 장소의 위도, 경도 객체
   * @param {string} initialName - 장소 이름의 초기값
   */
  function promptAndAddMarkerAndSave(latlng, initialName) {
    const placeName = prompt("이 장소의 이름을 입력하세요:", initialName);
    if (!placeName || placeName.trim() === "") return; // 이름 입력 없으면 취소

    // 알림 반경을 미터 단위로 입력받음 (기본값: 1km)
    let radius = parseInt(prompt("알림 반경을 미터 단위로 입력하세요 (기본값: 1km):", "1000"));
    // 유효하지 않은 입력(숫자가 아니거나 0 이하)일 경우 기본값 50m로 설정
    if (isNaN(radius) || radius <= 0) {
      radius = 1000;
    }

    const newPlace = {
      id: generateUniqueId(), // 고유 ID 생성
      name: placeName,
      lat: latlng.getLat(),
      lng: latlng.getLng(),
      radius: radius, // 알림 반경 저장
      isEntered: false // 지오펜싱 진입 상태 초기화
    };

    userPlaces.push(newPlace); // 새 장소를 배열에 추가
    savePlacesToLocalStorage(); // localStorage 업데이트
    displayPlacesOnMap(); // 지도 마커 업데이트

    console.log(`새 장소 등록 및 저장 완료: ${placeName}, 반경: ${radius}m`);
  }
};