import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import bodyParser from 'body-parser'; // Added body-parser

export function setupAuth(app: Express) {
  app.use(bodyParser.json()); // Added body-parser middleware

  // Debug: Print all incoming requests
  app.use((req, res, next) => {
    console.log("Incoming request:", {
      method: req.method,
      path: req.path,
      body: req.body,
      headers: req.headers
    });
    next();
  });

  // Session setup with debug
  const sessionMiddleware = session({
    secret: "test-secret",
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false }
  });

  app.use(sessionMiddleware);
  app.use(passport.initialize());
  app.use(passport.session());

  // Very simple strategy
  passport.use(new LocalStrategy(
    function(username, password, done) {
      console.log("Login attempt with:", { username, password });

      if (username === "admin" && password === "admin") {
        const user = { id: 1, username: "admin", isRootAdmin: true };
        console.log("Login successful for:", user);
        return done(null, user);
      }

      console.log("Login failed: invalid credentials");
      return done(null, false);
    }
  ));

  passport.serializeUser((user: any, done) => {
    console.log("Serializing user:", user);
    done(null, user.id);
  });

  passport.deserializeUser((id: number, done) => {
    console.log("Deserializing id:", id);
    if (id === 1) {
      const user = { id: 1, username: "admin", isRootAdmin: true };
      console.log("Deserialized user:", user);
      done(null, user);
    } else {
      console.log("Deserialize failed: invalid id");
      done(null, false);
    }
  });

  // Login route
  app.post("/api/login", (req, res, next) => {
    console.log("Login request received:", req.body);

    passport.authenticate("local", (err, user) => {
      console.log("Auth callback result:", { err, user });

      if (err) {
        console.error("Auth error:", err);
        return next(err);
      }

      if (!user) {
        console.log("Authentication failed");
        return res.status(401).json({ 
          message: "Login fehlgeschlagen: Ungültige Anmeldeinformationen" 
        });
      }

      req.logIn(user, (err) => {
        if (err) {
          console.error("Login error:", err);
          return next(err);
        }
        console.log("Login successful, sending response");
        res.json(user);
      });
    })(req, res, next);
  });

  // Logout route
  app.post("/api/logout", (req, res) => {
    req.logout(() => {
      res.sendStatus(200);
    });
  });

  // User info route
  app.get("/api/user", (req, res) => {
    console.log("User info requested", {
      authenticated: req.isAuthenticated(),
      user: req.user
    });

    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }
    res.json(req.user);
  });
}