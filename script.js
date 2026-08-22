
    // ── DATA ──
    const ROUTES = [
      { name: 'Harare → Masvingo', price: 15, duration: '4 hrs', icon: 'bus', desc: 'Daily direct service' },
      { name: 'Masvingo → Harare', price: 15, duration: '4 hrs', icon: 'bus', desc: 'Daily direct service' },
      { name: 'Masvingo Local', price: 10, duration: 'Varies', icon: 'van', desc: 'Multiple drop-offs' },
      { name: 'Harare → Mutare', price: 20, duration: '3.5 hrs', icon: 'coach', desc: 'Eastern highlands route' },
      { name: 'Bulawayo → Harare', price: 25, duration: '5 hrs', icon: 'bus', desc: 'Long-distance express' },
      { name: 'Gweru → Masvingo', price: 12, duration: '2 hrs', icon: 'van', desc: 'Midlands connector' },
    ];

    let bookings = JSON.parse(localStorage.getItem('rzw_bookings') || '[]');
    let activeFilter = 'all';

    // ── UTILS ──
    function save() { localStorage.setItem('rzw_bookings', JSON.stringify(bookings)); }
    function genRef() { return 'MT' + String(Date.now()).slice(-6); }
    function toast(msg, type = 'success') {
      const t = document.getElementById('toast');
      t.textContent = msg; t.className = 'toast ' + type;
      requestAnimationFrame(() => t.classList.add('show'));
      setTimeout(() => t.classList.remove('show'), 3200);
    }
    function $(id) { return document.getElementById(id); }

    // ── NAVIGATION ──
    function showPage(name) {
      document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
      // Init maps when booking page opens
      if (name === 'book') { setTimeout(function(){ initMaps(); if(pickupMap) pickupMap.invalidateSize(); if(dropoffMap) dropoffMap.invalidateSize(); }, 150); }
      closeMobileMenu();
      document.querySelectorAll('.nav-links button').forEach(b => b.classList.remove('active'));
      $('page-' + name).classList.add('active');
      const nb = $('nav-' + name.split('-')[0]);
      if (nb) nb.classList.add('active');
      window.scrollTo(0, 0);
    }

    // ── HOME: RENDER ROUTES ──
    function renderRoutes() {
      const grid = $('route-grid');
      grid.innerHTML = ROUTES.map(r => `
    <div class="route-card">
      <div class="route-icon">${r.icon === 'bus' ? '<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#1a3d2b" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M2 11h20"/><path d="M8 17v2M16 17v2"/><circle cx="8" cy="17" r="1"/><circle cx="16" cy="17" r="1"/></svg>' : r.icon === 'van' ? '<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#1a3d2b" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="3" width="15" height="13" rx="1"/><path d="M16 8h4l3 4v4h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>' : '<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#1a3d2b" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="5" width="20" height="12" rx="2"/><path d="M2 10h20"/><path d="M7 19v-2M17 19v-2"/><circle cx="7" cy="19" r="1"/><circle cx="17" cy="19" r="1"/></svg>'}</div>
      <div class="route-name">${r.name}</div>
      <div class="route-price">$${r.price} <span>/ person</span></div>
      <div class="route-meta">
        <div><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-right:4px"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>${r.duration}</div>
        <div><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-right:4px"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>${r.desc}</div>
      </div>
      <button class="book-btn" onclick="prefillRoute('${r.name}|${r.price}')">Book this route →</button>
    </div>
  `).join('');
    }

    function prefillRoute(val) {
      $('f-route').value = val;
      calcAmount();
      showPage('book');
    }

    // ── BOOKING ──
    function calcAmount() {
      const sel = $('f-route').value;
      const pax = parseInt($('f-pax').value) || 1;
      if (!sel) { $('amount-display').textContent = '$0'; return; }
      const price = parseInt(sel.split('|')[1]) || 0;
      $('amount-display').textContent = '$' + (price * pax);
    }

    function submitBooking() {
      const route = $('f-route').value;
      const pickup = $('f-pickup').value;
      const dropoff = $('f-dropoff').value;
      const date = $('f-date').value;
      const time = $('f-time').value;
      const name = $('f-name').value.trim();
      const phone = $('f-phone').value.trim();
      const pax = $('f-pax').value;

      if (!route || !pickup || !dropoff || !date || !time || !name || !phone) {
        toast('Please fill in all required fields.', 'error'); return;
      }
      if (pickup === dropoff) {
        toast('Pickup and drop-off cannot be the same.', 'error'); return;
      }
      const today = new Date(); today.setHours(0, 0, 0, 0);
      if (new Date(date) < today) {
        toast('Travel date cannot be in the past.', 'error'); return;
      }

      const routeName = route.split('|')[0];
      const price = parseInt(route.split('|')[1]);
      const amount = price * parseInt(pax);
      const ref = genRef();

      const booking = { ref, name, phone, route: routeName, pickup, dropoff, date, time, pax: parseInt(pax), amount, status: 'PENDING', created: new Date().toISOString() };
      bookings.push(booking);
      save();

      // Confirmation UI
      $('conf-ref').textContent = ref;
      $('conf-summary').innerHTML = `<strong>${routeName}</strong> · ${date} at ${time} · ${pax} pax · <strong>$${amount}</strong>`;
      $('wa-link').href = `https://wa.me/263786532334?text=Hi%2C%20I%20just%20booked%20a%20seat.%20Ref%3A%20${ref}%20%7C%20Route%3A%20${encodeURIComponent(routeName)}%20%7C%20Date%3A%20${date}%20%7C%20Amount%3A%20%24${amount}`;
      $('sms-link').href = `sms:+263786532334?body=Hi, I booked a seat. Ref: ${ref} | Route: ${routeName} | Date: ${date} | Amount: $${amount}`;

      // Reset form
      ['f-route', 'f-pickup', 'f-dropoff', 'f-time', 'f-date'].forEach(id => $(id).value = '');
      $('f-name').value = ''; $('f-phone').value = ''; $('f-pax').value = '1';
      $('amount-display').textContent = '$0';

      showPage('confirm');
    }

    // ── CHECK BOOKING ──
    function checkBooking() {
      const ref = $('check-ref').value.trim().toUpperCase();
      const result = $('booking-result');
      if (!ref) { toast('Enter a reference number', 'error'); return; }

      const b = bookings.find(x => x.ref === ref);
      if (!b) {
        result.innerHTML = `<div class="not-found">❌ No booking found for <strong>${ref}</strong>.<br>Check the reference and try again.</div>`;
        result.classList.add('visible');
        return;
      }

      const statusClass = b.status === 'CONFIRMED' ? 'status-confirmed' : b.status === 'CANCELLED' ? 'status-cancelled' : 'status-pending';
      result.innerHTML = `
    <div class="result-card">
      <div class="result-row"><label>Reference</label><strong>${b.ref}</strong></div>
      <div class="result-row"><label>Passenger</label><strong>${b.name}</strong></div>
      <div class="result-row"><label>Route</label><strong>${b.route}</strong></div>
      <div class="result-row"><label>Pickup</label><strong>${b.pickup}</strong></div>
      <div class="result-row"><label>Drop-off</label><strong>${b.dropoff}</strong></div>
      <div class="result-row"><label>Date & Time</label><strong>${b.date} · ${b.time}</strong></div>
      <div class="result-row"><label>Passengers</label><strong>${b.pax}</strong></div>
      <div class="result-row"><label>Amount</label><strong>$${b.amount}</strong></div>
      <div class="result-row"><label>Payment Status</label><span class="status-badge ${statusClass}">${b.status}</span></div>
    </div>`;
      result.classList.add('visible');
    }

    // ── ADMIN ──
    const ADMIN_PASS = 'admin123';

    function adminLogin() {
      const pass = $('admin-pass').value;
      if (pass === ADMIN_PASS) {
        $('login-error').style.display = 'none';
        $('admin-pass').value = '';
        showPage('admin');
        renderDashboard();
      } else {
        $('login-error').style.display = 'block';
      }
    }

    function adminLogout() {
      showPage('home');
    }

    function renderDashboard() {
      const filtered = activeFilter === 'all' ? bookings : bookings.filter(b => b.status === activeFilter);
      const confirmed = bookings.filter(b => b.status === 'CONFIRMED');
      const pending = bookings.filter(b => b.status === 'PENDING');
      const cancelled = bookings.filter(b => b.status === 'CANCELLED');
      const revenue = confirmed.reduce((s, b) => s + b.amount, 0);

      $('s-total').textContent = bookings.length;
      $('s-pending').textContent = pending.length;
      $('s-confirmed').textContent = confirmed.length;
      $('s-cancelled').textContent = cancelled.length;
      $('s-revenue').textContent = '$' + revenue;
      $('table-count').textContent = `Showing ${filtered.length} of ${bookings.length}`;

      const tbody = $('bookings-tbody');
      if (!filtered.length) {
        tbody.innerHTML = `<tr><td colspan="9" class="empty-table"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="margin-right:8px;vertical-align:middle"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>No bookings yet.</td></tr>`;
        return;
      }
      tbody.innerHTML = filtered.map(b => {
        const statusClass = b.status === 'CONFIRMED' ? 'status-confirmed' : b.status === 'CANCELLED' ? 'status-cancelled' : 'status-pending';
        const actions = b.status === 'PENDING' ? `
      <button class="action-btn action-confirm" onclick="changeStatus('${b.ref}','CONFIRMED')">Confirm</button>
      <button class="action-btn action-cancel" onclick="changeStatus('${b.ref}','CANCELLED')" style="margin-left:6px">Cancel</button>
    ` : b.status === 'CONFIRMED' ? `
      <button class="action-btn action-cancel" onclick="changeStatus('${b.ref}','CANCELLED')">Cancel</button>
    ` : '—';
        return `<tr>
      <td><strong>${b.ref}</strong></td>
      <td>${b.name}</td>
      <td>${b.phone}</td>
      <td>${b.route}</td>
      <td>${b.date}</td>
      <td>${b.pax}</td>
      <td><strong>$${b.amount}</strong></td>
      <td><span class="status-badge ${statusClass}">${b.status}</span></td>
      <td>${actions}</td>
    </tr>`;
      }).join('');
    }

    function changeStatus(ref, status) {
      const b = bookings.find(x => x.ref === ref);
      if (!b) return;
      b.status = status;
      save();
      renderDashboard();
      toast(`Booking ${ref} marked as ${status}.`);
    }

    function filterTable(filter, btn) {
      activeFilter = filter;
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderDashboard();
    }


    // ══ MOBILE MENU ══
    function toggleMobileMenu() {
      document.getElementById('mobile-menu').classList.toggle('open');
      document.getElementById('hamburger').classList.toggle('open');
    }
    function closeMobileMenu() {
      const m = document.getElementById('mobile-menu');
      const h = document.getElementById('hamburger');
      if (m) m.classList.remove('open');
      if (h) h.classList.remove('open');
    }

    // ══ MAP PICKERS ══
    let pickupMap, dropoffMap;
    let pickupMarker = null, dropoffMarker = null;
    let mapsReady = false;
    let acTimers = {};
    let acResults = {};

    function makeMarkerIcon(color) {
      return L.divIcon({
        html: '<svg xmlns="http://www.w3.org/2000/svg" width="30" height="40" viewBox="0 0 30 40"><path d="M15 0C6.716 0 0 6.716 0 15c0 9.5 15 25 15 25S30 24.5 30 15C30 6.716 23.284 0 15 0z" fill="'+color+'" stroke="white" stroke-width="2"/><circle cx="15" cy="15" r="6" fill="white"/><circle cx="15" cy="15" r="3.5" fill="'+color+'"/></svg>',
        iconSize:[30,40], iconAnchor:[15,40], popupAnchor:[0,-40], className:''
      });
    }

    function initMaps() {
      if (mapsReady) return;
      mapsReady = true;
      const ZW = [-20.0, 30.0];
      pickupMap = L.map('pickup-map', {zoomControl:true, attributionControl:true}).setView(ZW, 7);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'© OpenStreetMap'}).addTo(pickupMap);
      dropoffMap = L.map('dropoff-map', {zoomControl:true, attributionControl:true}).setView(ZW, 7);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'© OpenStreetMap'}).addTo(dropoffMap);

      pickupMap.on('click', function(e){ placePin('pickup', e.latlng.lat, e.latlng.lng); reverseGeo(e.latlng.lat, e.latlng.lng, 'pickup'); });
      dropoffMap.on('click', function(e){ placePin('dropoff', e.latlng.lat, e.latlng.lng); reverseGeo(e.latlng.lat, e.latlng.lng, 'dropoff'); });

      // Attach search input listeners
      document.getElementById('pickup-search').addEventListener('input', function(){ liveSearch('pickup', this.value); });
      document.getElementById('dropoff-search').addEventListener('input', function(){ liveSearch('dropoff', this.value); });
      document.getElementById('pickup-search').addEventListener('keydown', function(e){ if(e.key==='Enter'){ e.preventDefault(); doMapSearch('pickup'); }});
      document.getElementById('dropoff-search').addEventListener('keydown', function(e){ if(e.key==='Enter'){ e.preventDefault(); doMapSearch('dropoff'); }});
    }

    function placePin(type, lat, lng) {
      const map = type === 'pickup' ? pickupMap : dropoffMap;
      const color = type === 'pickup' ? '#1a3d2b' : '#e8a020';
      const icon = makeMarkerIcon(color);
      if (type === 'pickup') {
        if (pickupMarker) map.removeLayer(pickupMarker);
        pickupMarker = L.marker([lat,lng],{icon:icon,draggable:true}).addTo(map);
        pickupMarker.on('dragend', function(ev){ var ll=ev.target.getLatLng(); reverseGeo(ll.lat,ll.lng,'pickup'); });
      } else {
        if (dropoffMarker) map.removeLayer(dropoffMarker);
        dropoffMarker = L.marker([lat,lng],{icon:icon,draggable:true}).addTo(map);
        dropoffMarker.on('dragend', function(ev){ var ll=ev.target.getLatLng(); reverseGeo(ll.lat,ll.lng,'dropoff'); });
      }
      map.setView([lat,lng], 14, {animate:true});
    }

    function setLocation(type, address, lat, lng) {
      var short = address.split(',').slice(0,3).join(',').trim();
      document.getElementById('f-'+type).value = short;
      document.getElementById(type+'-addr-text').textContent = address;
      document.getElementById(type+'-addr-text').style.color = type==='pickup' ? 'var(--green)' : 'var(--gold)';
      document.getElementById(type+'-addr-text').style.fontWeight = '600';
      document.getElementById(type+'-search').value = short;
      document.getElementById('sum-'+type).textContent = short;
      hideAC(type);
      checkRouteSummary();
    }

    function checkRouteSummary() {
      var pu = document.getElementById('f-pickup').value;
      var dr = document.getElementById('f-dropoff').value;
      var strip = document.getElementById('route-summary');
      if (pu && dr) strip.classList.add('visible');
    }

    async function reverseGeo(lat, lng, type) {
      try {
        var res = await fetch('https://nominatim.openstreetmap.org/reverse?lat='+lat+'&lon='+lng+'&format=json',{headers:{'Accept-Language':'en','User-Agent':'RidesZW/1.0'}});
        var data = await res.json();
        setLocation(type, data.display_name || (lat.toFixed(5)+', '+lng.toFixed(5)), lat, lng);
      } catch(e) { setLocation(type, lat.toFixed(5)+', '+lng.toFixed(5), lat, lng); }
    }

    function liveSearch(type, q) {
      if (q.length < 2) { hideAC(type); return; }
      clearTimeout(acTimers[type]);
      acTimers[type] = setTimeout(async function(){
        try {
          var res = await fetch('https://nominatim.openstreetmap.org/search?q='+encodeURIComponent(q)+'&format=json&limit=6&addressdetails=1',{headers:{'Accept-Language':'en','User-Agent':'RidesZW/1.0'}});
          var data = await res.json();
          acResults[type] = data;
          var el = document.getElementById(type+'-autocomplete');
          if (!data.length) { el.style.display='none'; return; }
          var items = '';
          for (var i=0; i<data.length; i++) {
            var short = data[i].display_name.split(',').slice(0,3).join(',');
            items += '<li data-type="'+type+'" data-idx="'+i+'">'+short+'</li>';
          }
          el.innerHTML = items;
          el.style.display = 'block';
          // Use event delegation — no inline onclick with quotes
          el.querySelectorAll('li').forEach(function(li){
            li.addEventListener('click', function(){
              selectAC(this.getAttribute('data-type'), parseInt(this.getAttribute('data-idx')));
            });
          });
        } catch(e) { hideAC(type); }
      }, 300);
    }

    function selectAC(type, i) {
      var r = acResults[type][i]; if(!r) return;
      placePin(type, parseFloat(r.lat), parseFloat(r.lon));
      setLocation(type, r.display_name, parseFloat(r.lat), parseFloat(r.lon));
    }

    function hideAC(type) { document.getElementById(type+'-autocomplete').style.display='none'; }

    async function doMapSearch(type) {
      var q = document.getElementById(type+'-search').value.trim(); if(!q) return;
      try {
        var res = await fetch('https://nominatim.openstreetmap.org/search?q='+encodeURIComponent(q)+'&format=json&limit=1',{headers:{'Accept-Language':'en','User-Agent':'RidesZW/1.0'}});
        var data = await res.json();
        if (!data.length) { toast('Location not found. Try a different search.','error'); return; }
        placePin(type, parseFloat(data[0].lat), parseFloat(data[0].lon));
        setLocation(type, data[0].display_name, parseFloat(data[0].lat), parseFloat(data[0].lon));
      } catch(e) { toast('Search failed. Check your connection.','error'); }
    }

    // Close autocomplete on outside click
    document.addEventListener('click', function(e){
      ['pickup','dropoff'].forEach(function(t){
        var wrap = document.getElementById(t+'-search-wrap');
        if (wrap && !wrap.contains(e.target)) hideAC(t);
      });
    });

    // ── INIT ──
    renderRoutes();
    // Set min date on booking form
    const today = new Date().toISOString().split('T')[0];
    document.addEventListener('DOMContentLoaded', () => { if ($('f-date')) $('f-date').min = today; });
    if ($('f-date')) $('f-date').min = today;
