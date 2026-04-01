const dotenv = require('dotenv');
dotenv.config();

const express = require('express');
const app = express();

const mongoose = require('mongoose');

const path = require('path');

const ejsMate = require('ejs-mate');

const session = require('express-session');
const flash = require('connect-flash');

const methodOverride = require('method-override');
const helmet = require('helmet');

const passport = require('passport');
const localStrategy = require('passport-local');

const rateLimit = require('express-rate-limit');

const helmetConfig = {
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net", "https://cdnjs.cloudflare.com", "https://html5-qrcode", "https://ericblade"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net", "https://cdnjs.cloudflare.com"],
            imgSrc: ["'self'", "data:", "https:", "http:"],
            connectSrc: ["'self'", "https:", "http:"],
            fontSrc: ["'self'", "https://cdnjs.cloudflare.com"],
        },
    },
};

const authRoutes = require('./routes/auth');
const formRoutes = require('./routes/form');
const receiptRoutes = require('./routes/reciept');
const userRoutes = require('./routes/user');
const comparisonRoutes = require('./routes/comparison');
const dashboardRoutes = require('./routes/dashboard');
const voiceInputRoutes = require('./routes/voiceInput');
const goalsRoutes = require('./routes/goals');
const feedbackRoutes = require('./routes/feedback');
const footerLinksRoutes = require('./routes/footerLinks');
const chatbotRoutes = require('./routes/chatbot');
const contactUsRoutes = require('./routes/contactUs');

const sanitizeV5 = require('./utils/mongoSanitizev5');
const { startDailyScheduler, triggerGoalStatusUpdate } = require('./utils/scheduler');

const ExpressError = require('./utils/expressError');

const User = require('./models/user');

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

mongoose.connect(process.env.DB_URL)
  .then(() => {
    console.log("Mongo Connection Open");
  })
  .catch((err) => {
    console.log("Error connecting to MongoDB", err.message);
  });

app.set('views', path.join(__dirname, 'views'));

app.use(sanitizeV5({ replaceWith: '_' }));

app.set('query parser', 'extended');

app.set('view engine', 'ejs');
app.use(express.urlencoded({extended : true}));
app.engine('ejs', ejsMate);

app.use(express.static(path.join(__dirname, 'public')));

app.use(express.json());

app.use(helmet(helmetConfig));

const sessionConfig = {
    secret : process.env.SECRET,
    resave : false,
    saveUninitialized : true,
    cookie : {
        secure : false, 
        httpOnly: true,
        expires : new Date(Date.now() + 1000 * 60 * 60 * 24 * 7),
        maxAge: 1000 * 60 * 60 * 24 * 7,
    }
}

const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, 
    max: 150,
    message: 'Too many requests, please try again later.',
});

app.use(session(sessionConfig));
app.use(flash());

app.use(limiter);

app.use(methodOverride('_method'));

app.use(passport.initialize());
app.use(passport.session());
passport.use(new localStrategy(User.authenticate()));

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.use((req, res, next)=>{
    res.locals.currentUser = req.user;
    res.locals.success = req.flash('success');
    res.locals.error = req.flash('error');
    res.locals.info = req.flash('info');
    res.locals.warning = req.flash('warning')
    next();
});

// Make current URL available to all views
app.use((req, res, next) => {
    res.locals.currentUrl = req.originalUrl;
    next();
});

app.use('/', authRoutes);
app.use('/form', formRoutes);
app.use('/', receiptRoutes);
app.use('/', userRoutes);
app.use('/', comparisonRoutes);
app.use('/dashboard', dashboardRoutes);
app.use('/voiceInput', voiceInputRoutes);
app.use('/goals', goalsRoutes);
app.use('/feedback', feedbackRoutes);
app.use('/', footerLinksRoutes);
app.use('/chatbot', chatbotRoutes);
app.use('/contact-us', contactUsRoutes);

app.get('/', (req, res)=>{
    res.render('home')
});

// Manual trigger endpoint for goal status update (for testing)
app.get('/admin/update-goals', async (req, res) => {
    try {
        const result = await triggerGoalStatusUpdate();
        res.json({ 
            success: true, 
            message: 'Goal status update triggered', 
            result 
        });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            message: 'Error triggering goal status update', 
            error: error.message 
        });
    }
});


app.all(/(.*)/, (req, res, next) => {
    next(new ExpressError('Page not found', 404))
});

app.use((err, req, res, next)=>{
    const {statusCode = 500} = err;
    if(!err.message){
        err.message = 'Something Went Wrong!'
    }
    res.status(statusCode).render('error', {err})
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`App running on port ${PORT}`);
    
    // Start the daily scheduler for goal status updates
    startDailyScheduler();
});