import React, { useState, useEffect } from 'react';
import axios from 'axios';

const AccountManagement = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await axios.get('https://hostyoyaku.onrender.com/api/users');
      setUsers(res.data);
      setLoading(false);
    } catch (err) {
      console.error("Error fetching users", err);
    }
  };

  const toggleAdmin = async (userId, currentStatus) => {
    try {
      // Logic: If they are admin (1), make them user (0) and vice versa
      const newStatus = currentStatus === 1 ? 0 : 1;
      await axios.put(`https://hostyoyaku.onrender.com/api/users/${userId}/role`, {
        isAdmin: newStatus
      });
      
      // Update local state to reflect change
      setUsers(users.map(u => u.user_id === userId ? { ...u, is_admin: newStatus } : u));
      alert("User role updated!");
    } catch (err) {
      alert("Failed to update role");
    }
  };

  if (loading) return <p>Loading users...</p>;

  return (
    <div style={{ padding: '20px' }}>
      <h2>Admin Management</h2>
      <table border="1" cellPadding="10" style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ background: '#f4f4f4' }}>
            <th>Name</th>
            <th>Email</th>
            <th>Current Role</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr key={user.user_id}>
              <td>{user.first_name} {user.last_name}</td>
              <td>{user.email}</td>
              <td>{user.is_admin === 1 ? '⭐ Admin' : 'User'}</td>
              <td>
                <button 
                  onClick={() => toggleAdmin(user.user_id, user.is_admin)}
                  style={{
                    backgroundColor: user.is_admin === 1 ? '#ff4d4d' : '#4CAF50',
                    color: 'white',
                    border: 'none',
                    padding: '5px 10px',
                    cursor: 'pointer'
                  }}
                >
                  {user.is_admin === 1 ? 'Remove Admin' : 'Make Admin'}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default AccountManagement;