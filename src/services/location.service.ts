class LocationService {
  async getCities(country: string) {
    const response = await fetch(
      "https://countriesnow.space/api/v0.1/countries/cities",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ country }),
      }
    );

    const data = await response.json();

    return data.data || [];
  }
}

export const locationService = new LocationService();