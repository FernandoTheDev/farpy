/**
 * Farpy - A programming language
 *
 * Copyright (c) 2025 Fernando (FernandoTheDev)
 *
 * This software is licensed under the MIT License.
 * See the LICENSE file in the project root for full license information.
 */ export class TempCounter {
  private count = 0;
  public next(): string {
    return `%farpy_${this.count++}`;
  }
}
