using System;

namespace Zity.Services
{
    public static class GeoMapper
    {
        private record CityPoint(string Name, double Lat, double Lon);

        // Centroides aproximados de referencia
        private static readonly CityPoint[] Points = new[]
        {
            new CityPoint("San Salvador", 13.69294, -89.21819),
            new CityPoint("Soyapango",    13.71000, -89.15300),
            new CityPoint("Santa Tecla",  13.67600, -89.27900)
        };

        public static string? GetNearestMunicipioName(double lat, double lon)
        {
            string? best = null;
            double bestDist = double.MaxValue;

            foreach (var p in Points)
            {
                double d = Haversine(lat, lon, p.Lat, p.Lon);
                if (d < bestDist) { bestDist = d; best = p.Name; }
            }
            return best; // en km
        }

        // Distancia Haversine (km)
        private static double Haversine(double lat1, double lon1, double lat2, double lon2)
        {
            const double R = 6371.0;
            double dLat = ToRad(lat2 - lat1);
            double dLon = ToRad(lon2 - lon1);
            lat1 = ToRad(lat1); lat2 = ToRad(lat2);

            double a = Math.Sin(dLat / 2) * Math.Sin(dLat / 2) +
                       Math.Cos(lat1) * Math.Cos(lat2) *
                       Math.Sin(dLon / 2) * Math.Sin(dLon / 2);
            double c = 2 * Math.Atan2(Math.Sqrt(a), Math.Sqrt(1 - a));
            return R * c;
        }
        private static double ToRad(double deg) => deg * Math.PI / 180.0;
    }
}
