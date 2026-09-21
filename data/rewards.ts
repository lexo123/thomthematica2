export interface ImageConfig {
  url: string;
  caption: string;
}

// სუპერ გამარჯვებულის გიფები (გამოჩნდება ყოველ მე-3 მოგებულ ბლოკზე)
export const SUPER_WINNER_GIFS: ImageConfig[] = [
  {
    url: "https://drive.google.com/file/d/1DU-CMdFFdzkPbwj2F3v_WltO6lEHxQHU/view?usp=sharing",
    caption: "ბრავისიმოოო!!!"
  },
];

// გამარჯვებულის სურათები და ტექსტები
export const WINNER_IMAGES: ImageConfig[] = [
  
  { 
    url: "https://drive.google.com/file/d/1sZmOQ4UFRTcZYxdxaQxv70Q7Y7eZbqdq/view?usp=sharing", 
    caption: "ყოჩაღ, სწორია"  },
];

// დამარცხებულის სურათები და ტექსტები
export const LOSER_IMAGES: ImageConfig[] = [
  
  { 
    url: "https://drive.google.com/file/d/1wJ83G-9r2OIFZSf0AbapzszHsqO7VHwr/view?usp=sharing", 
    caption: "ვერ გამოიცანი"
  },
];

