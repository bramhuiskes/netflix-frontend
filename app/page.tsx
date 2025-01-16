"use client";
import { useState } from "react";
import { Bar } from "react-chartjs-2";
import {Chart as ChartJS, BarElement, CategoryScale, LinearScale, Tooltip, Legend, ChartData} from "chart.js";

ChartJS.register(BarElement, CategoryScale, LinearScale, Tooltip, Legend);

export default function Home() {
  const [token, setToken] = useState<string | null>(null);
  interface Movie {
    id: number;
    title: string;
    viewer_indications?: string;
    imageUrl?: string;
  }
  interface History {
    id: number;
    profile_id: number;
    content_id: number;
    content_type: string;
    watch_date: string;
    watch_duration: number;
    completion_status: string;
  }
  const [chartData, setChartData] = useState<ChartData<'bar'>>({
    labels: [],
    datasets: [
      {
        label: '',
        data: [],
        backgroundColor: [],
        borderColor: [],
        borderWidth: 1,
      },
    ],
  });  const [movies, setMovies] = useState<Movie[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const loginResponse = await fetch("http://127.0.0.1:8000/api/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: "test@test.nl",
          password: "test",
        }),
      });

      const loginData = await loginResponse.json();

      if (loginResponse.ok && loginData.token) {
        setToken(loginData.token);
        await fetchMovies(loginData.token);
      } else {
        setError("Login failed");
      }
    } catch (err) {
      setError("An error occurred during login");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchMovies = async (token: string) => {
    try {
      const movieResponse = await fetch(
        "http://127.0.0.1:8000/api/movie",
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const historyResponse = await fetch(
          "http://127.0.0.1:8000/api/view_history",
          {
            headers: {
              Authorization: `Bearer ${token}`,
            }
          }
      )

      if (movieResponse.ok && historyResponse.ok) {
        const movieData: Movie[] = await movieResponse.json();
        const historyData: History[] = await historyResponse.json();

        const moviesWithPosters = await Promise.all(
          movieData.map(async (movie) => {
            const posterResponse = await fetch(
              `https://www.omdbapi.com/?apikey=353496b1&t=${encodeURIComponent(
                movie.title
              )}`
            );
  
            if (posterResponse.ok) {
              const posterData = await posterResponse.json();
              const posterUrl = posterData.Poster; 
  
              const imageBlob = posterUrl !== "N/A" 
                ? await fetch(posterUrl).then((res) => res.blob())
                : null;
  
              return {
                ...movie,
                imageUrl: imageBlob ? URL.createObjectURL(imageBlob) : 'placeholder-image-url',
              };
            } else {
              return {
                ...movie,
                imageUrl: "placeholder-image-url",
              };
            }
          })
        );

        const historyDataMapped = await Promise.all(
            historyData.map(async (history) => {
              const id = history.content_id;
              const type = history.content_type;

              if (type == "Movie")
              {
                const singleMovie = moviesWithPosters.filter(movie => movie.id === id)[0];

                return singleMovie.title.toString();
              } else {
                return "";
              }
            })
        );

        const movieCounts: { [key: string]: number } = {};

        historyDataMapped.forEach((movie) => {
          movieCounts[movie] = (movieCounts[movie] || 0) + 1;
        });

        console.log(movieCounts);  // Output the counts

        const movieTitles = Object.keys(movieCounts);
        const movieDataChart = movieTitles.map((title) => movieCounts[title]);

        setChartData({
          labels: movieTitles, // Movie titles (if `historyDataMapped` is just the list of titles)
          datasets: [
            {
              label: "Views",
              data: movieDataChart, // View counts for each movie (now as integers)
              backgroundColor: [
                "rgba(75, 192, 192, 0.6)", // Bar colors
                "rgba(255, 99, 132, 0.6)",
                "rgba(54, 162, 235, 0.6)",
              ],
              borderColor: [
                "rgba(75, 192, 192, 1)", // Bar border colors
                "rgba(255, 99, 132, 1)",
                "rgba(54, 162, 235, 1)",
              ],
              borderWidth: 1, // Border width
            },
          ],
        });


        setMovies(moviesWithPosters);
      } else {
        setError("Failed to fetch movies");
      }
    } catch (err) {
      setError("An error occurred while fetching movies");
      console.error(err);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white font-sans">
      <nav className="bg-black bg-opacity-90 p-4 flex justify-between items-center">
        <h1 className="text-3xl font-bold text-red-600">NETFLIX</h1>
        <button
          onClick={handleLogin}
          className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
          disabled={isLoading}
        >
          {isLoading ? "Logging in..." : "Login"}
        </button>
      </nav>

      <main className="container mx-auto px-4 py-8">
        {token ? (
          <div>
            <h2 className="text-2xl font-bold mb-4">Movies</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {movies.map((movie) => (
                <div 
                  key={movie.id ? movie.id.toString() : movie.title}
                  className="bg-gray-800 rounded-lg overflow-hidden shadow-lg flex flex-col"
                >
                  <img
                    src={movie.imageUrl}
                    alt={movie.title}
                    className="w-full object-cover"
                  />
                  <div className="p-4">
                    <h3 className="text-lg font-bold">{movie.title}</h3>
                    <p className="text-sm text-gray-400">
                      {movie.viewer_indications || "No description available"}
                    </p>
                   
                  </div>
                </div>
              ))}
            </div>
            <h2 className="text-2xl font-bold mb-4">Most seen movies</h2>
            <Bar data={chartData} options={{ responsive: false, maintainAspectRatio: false }} />
          </div>
        ) : (
            <div className="flex flex-col items-center justify-center h-full">
            <h2 className="text-2xl mb-4">Login to see movies</h2>
            {error && <p className="text-red-500 mt-4">{error}</p>}
          </div>
        )}
      </main>
    </div>
  );
}
