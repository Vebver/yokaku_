import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, CheckCircle2, PlayCircle, Timer, Filter, ChevronRight } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import '../../Style/KitchenPage.css';

const INITIAL_ORDERS = [
];

const StatusBadge = ({ status }) => {
  // Mapping statuses to the CSS classes defined in your CSS file
  const badgeClass = `badge badge-${status}`;
  return <span className={badgeClass}>{status}</span>;
};

const OrderCard = ({ order, onUpdateStatus }) => {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
  const calculateTime = () => {
    // Ensure we are working with a valid Date object (handles ISO strings or Date objects)
    const startTime = new Date(order.timestamp).getTime();
    const now = Date.now();
    
    // Calculate difference in minutes, ensuring it's never below 0
    const minutesElapsed = Math.floor((now - startTime) / 60000);
    setElapsed(Math.max(0, minutesElapsed));
  };

  // Run immediately on mount
  calculateTime();

  // Update every 10 seconds to keep the "Xm ago" display accurate
  const timer = setInterval(calculateTime, 10000);

  // Cleanup interval on unmount or when timestamp changes
  return () => clearInterval(timer);
}, [order.timestamp]);

  const getTimerClass = () => {
    if (elapsed > 15) return "time-elapsed critical"; // Add red color in CSS for critical
    if (elapsed > 10) return "time-elapsed warning";  // Add orange color in CSS for warning
    return "time-elapsed";
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="order-card"
    >
      <div className="card-header">
        <div className="header-main">
          <span className="table-number">T-{order.table}</span>
          <StatusBadge status={order.status} />
        </div>
        <div className={getTimerClass()}>
          <Timer size={14} />
          <span>{elapsed}m</span>
        </div>
      </div>

      <div className="card-body">
        <ul className="item-list">
          {order.items.map((item, idx) => (
            <li key={idx} className="item-row">
              <span className="item-name">{item.name}</span>
              <span className="qty">x{item.qty}</span>
            </li>
          ))}
        </ul>

        {order.instructions && (
          <div className="instructions">
            <MessageSquare size={14} />
            <p>{order.instructions}</p>
          </div>
        )}
      </div>

      <div className="card-footer">
        {order.status === 'pending' && (
          <button 
            onClick={() => onUpdateStatus(order.id, 'preparing')}
            className="action-btn btn-start"
          >
            <PlayCircle size={18} /> Start Preparing
          </button>
        )}
        {order.status === 'preparing' && (
          <button 
            onClick={() => onUpdateStatus(order.id, 'ready')}
            className="action-btn btn-ready"
          >
            <CheckCircle2 size={18} /> Mark as Ready
          </button>
        )}
        {order.status === 'ready' && (
          <button 
            onClick={() => onUpdateStatus(order.id, 'served')}
            className="action-btn btn-clear"
          >
            Clear Order
          </button>
        )}
      </div>
    </motion.div>
  );
};

const KitchenPage = () => {
  const [orders, setOrders] = useState(INITIAL_ORDERS);
  const [filter, setFilter] = useState('all');
  const location = useLocation();
  
  useEffect(() => {
    if (location.state?.newOrder) {
      const newOrder = location.state.newOrder;
      
      // Prevent duplicate additions if the component re-renders
      setOrders(prevOrders => {
        const exists = prevOrders.find(o => o.id === newOrder.id);
        if (exists) return prevOrders;
        return [newOrder, ...prevOrders]; // Add new order to the TOP
      });

      // Clear the state so refreshing doesn't add the same order again
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  const updateStatus = (id, newStatus) => {
    if (newStatus === 'served') {
      setOrders(orders.filter(o => o.id !== id));
    } else {
      setOrders(orders.map(o => o.id === id ? { ...o, status: newStatus } : o));
    }
  };

  const filteredOrders = orders.filter(o => filter === 'all' || o.status === filter);

  return (
    <div className="kitchen-wrapper">
      <header className="header">
        <div className="header-title">
          <div className="live-indicator" />
          <h1>Kitchen Queue</h1>
          <span className="order-count">{orders.length} Active</span>
        </div>

        <div className="filter-group">
          <Filter size={16} className="filter-icon" />
          {['all', 'pending', 'preparing', 'ready'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`filter-btn ${filter === f ? 'active' : ''}`}
            >
              {f}
            </button>
          ))}
        </div>
      </header>

      <main className="container">
        {filteredOrders.length > 0 ? (
          <motion.div layout className="order-grid">
            <AnimatePresence mode='popLayout'>
              {filteredOrders.map((order) => (
                <OrderCard 
                  key={order.id} 
                  order={order} 
                  onUpdateStatus={updateStatus}
                />
              ))}
            </AnimatePresence>
          </motion.div>
        ) : (
          <div className="empty-state">
            <CheckCircle2 size={48} />
            <p>Queue is empty</p>
          </div>
        )}
      </main>
    </div>
  );
};

export default KitchenPage;