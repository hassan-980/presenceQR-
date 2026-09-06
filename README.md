# Smart Attendance Hub

create a mern application for students attendence system in which we can login as student, teacher , admin. teacher generate the QR and student scan to mark their attendence it also use geolocation to avoid proxy,. In teacher dashboard they can see the full reports and can download the attendence report file . In the student dashboard they can see their overall attendence.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://presenceqr.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/2f42cb4e-3fb3-4a45-b002-190c4eaf6cf1).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```

### Running locally

The `.env` file in this repository already contains everything the app needs
(project URL + publishable key). No secret/service-role key is required —
class enrolment, attendance marking, session deletion and role changes all run
through secured database routines, so `npm run dev` works out of the box.
