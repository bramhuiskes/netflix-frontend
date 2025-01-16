"use client";
import { useState } from "react";

export default function Home() {
  const [token, setToken] = useState<string | null>(null);
  interface Movie {
    id: number;
    title: string;
    viewer_indications?: string;
    imageUrl?: string;
  }

  const [movies, setMovies] = useState<Movie[]>([]);
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
          email: "bramhuiskes@gmail.com",
          password: "bram",
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
        "http://127.0.0.1:8000/api/movies",
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      if (movieResponse.ok) {
        const movieData: Movie[] = await movieResponse.json();
  
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
