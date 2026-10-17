import * as FileSystem from 'expo-file-system';

export const fileSystemMiddleware = async <T>(
  filename: string,
  fallbackFetch: () => Promise<T>
): Promise<T> => {
  const fileUri = `${FileSystem.documentDirectory}${filename}.json`;

  try {
    const fileContent = (await FileSystem.readAsStringAsync(fileUri)) || '';

    if (!fileContent) {
      throw new Error(`Error while reading the file: ${fileUri}`);
    }

    return JSON.parse(fileContent);
  } catch (error) {
    console.error(error);
    console.info(
      `Resolving the issue by creating a new ${fileUri} file from fresh fetched data`
    );

    const fetchedSavedAlbums = await fallbackFetch();
    await FileSystem.writeAsStringAsync(
      fileUri,
      JSON.stringify(fetchedSavedAlbums),
      {
        encoding: FileSystem.EncodingType.UTF8,
      }
    );

    if (!fetchedSavedAlbums) {
      throw new Error(`Error while fetching filename from Spotify API`);
    }

    console.info(`File: ${fileUri} has been successfully created`);
    console.info('Done ✨');

    return fetchedSavedAlbums;
  }
};
