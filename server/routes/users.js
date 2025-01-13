router.post('/', async (req, res) => {
  try {
    const { username, password, email, is_admin } = req.body;
    
    // Validate required fields
    if (!username || !password || !email) {
      return res.status(400).json({ 
        message: 'Username, password, and email are required' 
      });
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ 
        message: 'Invalid email format' 
      });
    }

    // Hash password using bcrypt with salt rounds of 10
    const hashedPassword = await bcrypt.hash(password, 10);

    // Store the hashed password in the database
    const result = await db.run(`
      INSERT INTO users (username, password, email, is_admin)
      VALUES (?, ?, ?, ?)
    `, [username, hashedPassword, email, is_admin ? 1 : 0]);

    const user = {
      id: result.lastID,
      username,
      email,
      is_admin: Boolean(is_admin)
    };

    res.status(201).json({ user });
  } catch (error) {
    // Check for unique constraint violations
    if (error.message.includes('UNIQUE constraint failed')) {
      return res.status(400).json({
        message: 'Username or email already exists'
      });
    }
    
    console.error('Error creating user:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});
        message: 'Invalid email format' 
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

 