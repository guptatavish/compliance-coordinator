
# Python Backend for ComplianceSync

This is a simple Flask-based Python backend for the ComplianceSync application. It provides API endpoints for analyzing compliance requirements using the Perplexity API.

## Setup Instructions

1. **Clone this repository**

2. **Install dependencies**

   ```bash
   pip install -r requirements.txt
   ```

3. **Run the server**

   ```bash
   python app.py
   ```

   The server will run at `http://localhost:5000` by default.

## API Endpoints

### Health Check

- **URL**: `/health`
- **Method**: `GET`
- **Description**: Simple health check to verify the backend is running.

### Analyze Compliance

- **URL**: `/analyze-compliance`
- **Method**: `POST`
- **Request Body**:
  ```json
  {
    "apiKey": "your-perplexity-api-key",
    "companyProfile": {
      "companyName": "Example Corp",
      "companySize": "51-200",
      "industry": "fintech",
      "description": "A fintech company that provides payment services",
      "currentJurisdictions": ["us", "eu"],
      "targetJurisdictions": ["sg", "uk"]
    },
    "jurisdiction": "us"
  }
  ```
- **Response**: JSON object containing compliance analysis

## Requirements

- Python 3.8+
- Flask
- Requests
- Flask-CORS

## Notes

- This backend requires a valid Perplexity API key to function.
- The API key should be provided by the frontend in each request.
- The backend should be running for the ComplianceSync frontend to function correctly.
