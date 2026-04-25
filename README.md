# Podo Search: Izmir Mystery

Frontend investigation panel built for the Jotform Hackathon challenge.

## Developer

- **Name:** Ali Kaan Koç

## Project Summary

This project is a dark-themed detective dashboard that pulls **real-time Jotform data** (no mock/fake data) and helps identify the most suspicious person in the case.

Main sections:

- **Dashboard:** Izmir party check-in records
- **Sightings:** Where and when suspects were seen
- **Suspects:** Merged suspect profiles with suspicion score and risk coloring
- **Tips:** Anonymous tips with confidence-based color tags
- **Prime Suspect:** Explainable top suspect view with confidence percentage, Top-5 ranking, and impact simulation

## Tech Stack

- React (Vite)
- Tailwind CSS
- Axios
- React Router

## Environment Variables

Create a `.env` file in the project root:

```env
VITE_JOTFORM_API_KEY=your_api_key_here
```

Use `.env.example` as the template.

## Form IDs Used

- `CHECKINS`: `261134527667966`
- `MESSAGES`: `261133651963962`
- `SIGHTINGS`: `261133720555956`
- `PERSONAL_NOTES`: `261134449238963`
- `ANONYMOUS_TIPS`: `261134430330946`

## Run Locally

1. Install dependencies:

```bash
npm install
```

2. Start development server:

```bash
npm run dev
```

3. Build for production:

```bash
npm run build
```

## Notes

- `.env` is gitignored for security.
- The app is designed to stay simple, fast, and presentation-ready for demo flow.
