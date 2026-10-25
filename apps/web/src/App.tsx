import { useEffect, useMemo, useState } from 'react';
import { NavLink, Route, Routes, BrowserRouter } from 'react-router-dom';

type DashboardData = {
  userName: string;
  memberStatus: string;
  packageName: string;
  remainingSessions: number;
  nextClass: string;
  attendanceRate: number;
  upcomingBookings: Array<{
    id: number;
    className: string;
    day: string;
    time: string;
    trainer: string;
    status: string;
  }>;
};

const traineeFallback: DashboardData = {
  userName: 'Nattapon',
  memberStatus: 'Active',
  packageName: '10 Sessions',
  remainingSessions: 6,
  nextClass: 'Evening Muay Thai Conditioning',
  attendanceRate: 92,
  upcomingBookings: [
    { id: 1, className: 'Muay Thai Conditioning', day: 'Tue', time: '18:30', trainer: 'Coach A', status: 'Confirmed' },
    { id: 2, className: 'Bag Work', day: 'Thu', time: '19:00', trainer: 'Coach B', status: 'Confirmed' },
    { id: 3, className: 'Technique Lab', day: 'Sat', time: '10:00', trainer: 'Coach C', status: 'Pending' },
  ],
};

const adminFallback = {
  activeMembers: 214,
  todayClasses: 12,
  bookedSeats: 86,
  pendingPayments: 5,
  packagesNearExpiry: 3,
};

const schedule = [
  { time: '18:00', className: 'Beginner Boxing', trainer: 'Coach A', capacity: '12/16', status: 'Open' },
  { time: '18:30', className: 'Muay Thai Conditioning', trainer: 'Coach B', capacity: '14/16', status: 'Open' },
  { time: '19:30', className: 'Advanced Sparring', trainer: 'Coach C', capacity: '8/10', status: 'Almost Full' },
  { time: '20:30', className: 'Recovery Mobility', trainer: 'Coach D', capacity: '6/12', status: 'Open' },
];

function AppShell() {
  const navItems = [
    { label: 'Trainee', to: '/trainee' },
    { label: 'Admin', to: '/admin' },
    { label: 'Schedule', to: '/schedule' },
  ];

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand-block">
          <div className="brand-mark">TM</div>
          <div>
            <div className="brand-name">Thunder Muaythai</div>
            <div className="brand-subtitle">Member system</div>
          </div>
        </div>

        <nav className="main-nav" aria-label="Main navigation">
          {navItems.map((item) => (
            <NavLink key={item.to} to={item.to} className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}>
              {item.label}
            </NavLink>
          ))}
        </nav>
      </header>

      <main className="content-area">
        <Routes>
          <Route path="/" element={<TraineeDashboard />} />
          <Route path="/trainee" element={<TraineeDashboard />} />
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/schedule" element={<ClassSchedule />} />
        </Routes>
      </main>
    </div>
  );
}

function TraineeDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const response = await fetch('http://localhost:3001/api/trainee/dashboard');
        if (!response.ok) {
          throw new Error('Failed to load');
        }
        const payload = await response.json();
        setData(payload);
      } catch {
        setData(traineeFallback);
      }
    };

    void load();
  }, []);

  const nextBooking = useMemo(() => {
    return data?.upcomingBookings?.[0] ?? traineeFallback.upcomingBookings[0];
  }, [data]);

  return (
    <section className="page-grid">
      <div className="panel hero-panel">
        <div>
          <p className="eyebrow">Trainee overview</p>
          <h1>Welcome back, {data?.userName ?? 'Nattapon'}</h1>
        </div>

        <div className="hero-metrics">
          <div className="metric-card accent">
            <span className="metric-label">Status</span>
            <strong>{data?.memberStatus ?? 'Active'}</strong>
          </div>
          <div className="metric-card">
            <span className="metric-label">Package</span>
            <strong>{data?.packageName ?? '10 Sessions'}</strong>
          </div>
          <div className="metric-card">
            <span className="metric-label">Sessions left</span>
            <strong>{data?.remainingSessions ?? 6}</strong>
          </div>
        </div>
      </div>

      <div className="panel focus-panel">
        <p className="eyebrow">Next class</p>
        <h2>{data?.nextClass ?? 'Evening Muay Thai Conditioning'}</h2>
        <div className="meta-row">
          <span>{nextBooking.day}</span>
          <span>{nextBooking.time}</span>
          <span>{nextBooking.trainer}</span>
        </div>
        <button className="primary-btn">Check-in</button>
      </div>

      <div className="panel table-panel">
        <div className="panel-header">
          <h3>Upcoming bookings</h3>
          <span className="chip">{data?.upcomingBookings?.length ?? 3} items</span>
        </div>

        <div className="booking-list">
          {(data?.upcomingBookings ?? traineeFallback.upcomingBookings).map((booking) => (
            <div key={booking.id} className="booking-row">
              <div>
                <strong>{booking.className}</strong>
                <small>{booking.day} • {booking.time}</small>
              </div>
              <div>
                <small>{booking.trainer}</small>
              </div>
              <span className={`status-badge ${booking.status.toLowerCase()}`}>{booking.status}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="panel summary-panel">
        <div className="panel-header">
          <h3>Performance</h3>
        </div>
        <div className="score-block">
          <span className="score-value">{data?.attendanceRate ?? 92}%</span>
          <small>Attendance rate</small>
        </div>
      </div>
    </section>
  );
}

function AdminDashboard() {
  const [data, setData] = useState(adminFallback);

  useEffect(() => {
    const load = async () => {
      try {
        const response = await fetch('http://localhost:3001/api/admin/dashboard');
        if (!response.ok) {
          throw new Error('Failed');
        }
        const payload = await response.json();
        setData(payload);
      } catch {
        setData(adminFallback);
      }
    };

    void load();
  }, []);

  const cards = [
    { label: 'Active members', value: data.activeMembers },
    { label: 'Classes today', value: data.todayClasses },
    { label: 'Booked seats', value: data.bookedSeats },
    { label: 'Pending payments', value: data.pendingPayments },
  ];

  return (
    <section className="page-grid admin-grid">
      <div className="panel hero-panel wide-panel">
        <div>
          <p className="eyebrow">Admin dashboard</p>
          <h1>Operations overview</h1>
        </div>
        <div className="stat-grid">
          {cards.map((card) => (
            <div key={card.label} className="metric-card">
              <span className="metric-label">{card.label}</span>
              <strong>{card.value}</strong>
            </div>
          ))}
        </div>
      </div>

      <div className="panel table-panel">
        <div className="panel-header">
          <h3>Packages nearing expiry</h3>
          <span className="chip">{data.packagesNearExpiry} items</span>
        </div>
        <ul className="list-compact">
          <li>10 Sessions - 3 members</li>
          <li>Monthly Unlimited - 5 members</li>
          <li>Personal Training - 2 members</li>
        </ul>
      </div>
    </section>
  );
}

function ClassSchedule() {
  return (
    <section className="page-grid">
      <div className="panel table-panel full-span">
        <div className="panel-header">
          <h3>Class schedule</h3>
          <span className="chip">This week</span>
        </div>

        <div className="schedule-table">
          {schedule.map((item) => (
            <div key={item.time} className="schedule-row">
              <span>{item.time}</span>
              <strong>{item.className}</strong>
              <span>{item.trainer}</span>
              <span>{item.capacity}</span>
              <span className={`status-badge ${item.status.toLowerCase().replace(/\s+/g, '-')}`}>{item.status}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function App() {
  return (
    <BrowserRouter>
      <AppShell />
    </BrowserRouter>
  );
}
