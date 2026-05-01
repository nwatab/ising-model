mod utils;

use wasm_bindgen::prelude::*;

// ── Fast xorshift64 RNG ──────────────────────────────────────────────────────

struct Rng(u64);

impl Rng {
    fn new(seed: u64) -> Self {
        Rng(if seed == 0 { 0x123456789abcdef0 } else { seed })
    }

    #[inline(always)]
    fn next_u64(&mut self) -> u64 {
        let mut x = self.0;
        x ^= x << 13;
        x ^= x >> 7;
        x ^= x << 17;
        self.0 = x;
        x
    }

    // Returns f64 in [0, 1)
    #[inline(always)]
    fn next_f64(&mut self) -> f64 {
        (self.next_u64() >> 11) as f64 * (1.0_f64 / (1u64 << 53) as f64)
    }
}

// ── Color-sorted bitpacked layout ───────────────────────────────────────────
//
// bitIdx = color * M³ + ix + M*iy + M²*iz
//   where color = (x&1)<<2 | (y&1)<<1 | (z&1),  M = N/2
//         ix = x/2, iy = y/2, iz = z/2
//
// Sites of the same color are mutually non-adjacent (no NN or NNN links),
// so each color block can be written independently — enabling future
// lock-free parallel sweeps.

#[inline(always)]
fn bit_index(x: usize, y: usize, z: usize, n: usize) -> usize {
    let m = n >> 1;
    let color = ((x & 1) << 2) | ((y & 1) << 1) | (z & 1);
    color * m * m * m + (x >> 1) + m * (y >> 1) + m * m * (z >> 1)
}

#[inline(always)]
fn wrap(coord: i64, n: usize) -> usize {
    coord.rem_euclid(n as i64) as usize
}

#[inline(always)]
fn get_spin_raw(data: &[u8], x: usize, y: usize, z: usize, n: usize) -> i32 {
    let idx = bit_index(x, y, z, n);
    if (data[idx >> 3] >> (idx & 7)) & 1 == 1 { 1 } else { -1 }
}

#[inline(always)]
fn get_spin(data: &[u8], x: i64, y: i64, z: i64, n: usize) -> i32 {
    get_spin_raw(data, wrap(x, n), wrap(y, n), wrap(z, n), n)
}

#[inline(always)]
fn flip_bit(data: &mut [u8], idx: usize) {
    data[idx >> 3] ^= 1u8 << (idx & 7);
}

fn energy_at(data: &[u8], x: usize, y: usize, z: usize, n: usize, k1: f64, k2: f64, h: f64) -> f64 {
    let xi = x as i64;
    let yi = y as i64;
    let zi = z as i64;
    let s = get_spin_raw(data, x, y, z, n) as f64;

    let nn = (get_spin(data, xi+1, yi,   zi,   n)
            + get_spin(data, xi-1, yi,   zi,   n)
            + get_spin(data, xi,   yi+1, zi,   n)
            + get_spin(data, xi,   yi-1, zi,   n)
            + get_spin(data, xi,   yi,   zi+1, n)
            + get_spin(data, xi,   yi,   zi-1, n)) as f64;

    let nnn = (get_spin(data, xi+1, yi+1, zi,   n)
             + get_spin(data, xi+1, yi-1, zi,   n)
             + get_spin(data, xi-1, yi+1, zi,   n)
             + get_spin(data, xi-1, yi-1, zi,   n)
             + get_spin(data, xi+1, yi,   zi+1, n)
             + get_spin(data, xi+1, yi,   zi-1, n)
             + get_spin(data, xi-1, yi,   zi+1, n)
             + get_spin(data, xi-1, yi,   zi-1, n)
             + get_spin(data, xi,   yi+1, zi+1, n)
             + get_spin(data, xi,   yi+1, zi-1, n)
             + get_spin(data, xi,   yi-1, zi+1, n)
             + get_spin(data, xi,   yi-1, zi-1, n)) as f64;

    -k1 * s * nn - k2 * s * nnn - h * s
}

// ── Public WASM API ──────────────────────────────────────────────────────────

#[wasm_bindgen]
pub struct SpinLattice {
    data: Vec<u8>,
    n: usize,
    rng: Rng,
}

#[wasm_bindgen]
impl SpinLattice {
    #[wasm_bindgen(constructor)]
    pub fn new(n: usize, seed: u64) -> SpinLattice {
        utils::set_panic_hook();
        let bytes = (n * n * n + 7) / 8;
        let mut lat = SpinLattice { data: vec![0u8; bytes], n, rng: Rng::new(seed) };
        lat.randomize();
        lat
    }

    pub fn from_bytes(bytes: &[u8], n: usize, seed: u64) -> SpinLattice {
        utils::set_panic_hook();
        SpinLattice { data: bytes.to_vec(), n, rng: Rng::new(seed) }
    }

    pub fn randomize(&mut self) {
        for byte in self.data.iter_mut() {
            *byte = self.rng.next_u64() as u8;
        }
    }

    pub fn set_ferro(&mut self) {
        for byte in self.data.iter_mut() { *byte = 0xff; }
    }

    pub fn set_neel(&mut self) {
        let n = self.n;
        for byte in self.data.iter_mut() { *byte = 0; }
        for z in 0..n {
            for y in 0..n {
                for x in 0..n {
                    if (x + y + z) % 2 == 0 {
                        let idx = bit_index(x, y, z, n);
                        self.data[idx >> 3] |= 1u8 << (idx & 7);
                    }
                }
            }
        }
    }

    pub fn set_layered(&mut self) {
        let n = self.n;
        for byte in self.data.iter_mut() { *byte = 0; }
        for z in 0..n {
            for y in 0..n {
                for x in 0..n {
                    if x % 2 == 0 {
                        let idx = bit_index(x, y, z, n);
                        self.data[idx >> 3] |= 1u8 << (idx & 7);
                    }
                }
            }
        }
    }

    pub fn set_diagonal_layered(&mut self) {
        let n = self.n;
        for byte in self.data.iter_mut() { *byte = 0; }
        for z in 0..n {
            for y in 0..n {
                for x in 0..n {
                    if (y + z) % 2 == 0 {
                        let idx = bit_index(x, y, z, n);
                        self.data[idx >> 3] |= 1u8 << (idx & 7);
                    }
                }
            }
        }
    }

    // 8-sublattice checkerboard sweep.
    // Colors are processed sequentially; within each color all N³/8 sites are
    // mutually non-adjacent, so the order within a color does not matter.
    pub fn sublattice_sweep(&mut self, k1: f64, k2: f64, h: f64) {
        let n = self.n;
        let m = n >> 1;

        for color in 0u8..8 {
            let sx = ((color >> 2) & 1) as usize;
            let sy = ((color >> 1) & 1) as usize;
            let sz = (color        & 1) as usize;

            for iz in 0..m {
                let z = iz * 2 + sz;
                for iy in 0..m {
                    let y = iy * 2 + sy;
                    for ix in 0..m {
                        let x = ix * 2 + sx;

                        let e_before = energy_at(&self.data, x, y, z, n, k1, k2, h);
                        let bit_idx = bit_index(x, y, z, n);
                        flip_bit(&mut self.data, bit_idx);
                        let e_after = energy_at(&self.data, x, y, z, n, k1, k2, h);
                        let delta = e_after - e_before;

                        if delta > 0.0 && self.rng.next_f64() > (-delta).exp() {
                            flip_bit(&mut self.data, bit_idx); // reject
                        }
                    }
                }
            }
        }
    }

    pub fn magnetization(&self) -> f64 {
        let n3 = self.n * self.n * self.n;
        let full_bytes = n3 / 8;
        let mut sum = 0i32;
        for i in 0..full_bytes {
            sum += 2 * self.data[i].count_ones() as i32 - 8;
        }
        let rem = n3 % 8;
        if rem > 0 {
            let mask = (1u8 << rem) - 1;
            sum += 2 * (self.data[full_bytes] & mask).count_ones() as i32 - rem as i32;
        }
        sum as f64 / n3 as f64
    }

    pub fn neel_order_param(&self) -> f64 {
        let n = self.n;
        let n3 = n * n * n;
        let mut sum = 0.0f64;
        for z in 0..n {
            for y in 0..n {
                for x in 0..n {
                    let sign = if (x + y + z) % 2 == 0 { 1.0 } else { -1.0 };
                    sum += sign * get_spin_raw(&self.data, x, y, z, n) as f64;
                }
            }
        }
        sum / n3 as f64
    }

    pub fn get_spin(&self, x: i32, y: i32, z: i32) -> i32 {
        get_spin(&self.data, x as i64, y as i64, z as i64, self.n)
    }

    pub fn lattice_size(&self) -> usize { self.n }

    /// Raw bitpacked bytes (color-sorted layout), for copying to JS.
    pub fn data(&self) -> Vec<u8> { self.data.clone() }
}

// ── Rust unit tests ──────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    fn make_ferro(n: usize) -> Vec<u8> {
        vec![0xffu8; (n * n * n + 7) / 8]
    }

    fn make_neel(n: usize) -> Vec<u8> {
        let mut data = vec![0u8; (n * n * n + 7) / 8];
        for z in 0..n {
            for y in 0..n {
                for x in 0..n {
                    if (x + y + z) % 2 == 0 {
                        let idx = bit_index(x, y, z, n);
                        data[idx >> 3] |= 1u8 << (idx & 7);
                    }
                }
            }
        }
        data
    }

    // bit_index maps all N³ coords to distinct values in [0, N³)
    #[test]
    fn bit_index_injective() {
        for n in [2usize, 4, 8] {
            let mut seen = std::collections::HashSet::new();
            for z in 0..n {
                for y in 0..n {
                    for x in 0..n {
                        let idx = bit_index(x, y, z, n);
                        assert!(idx < n * n * n, "N={n}: idx={idx} out of range at ({x},{y},{z})");
                        assert!(seen.insert(idx), "N={n}: duplicate idx={idx} at ({x},{y},{z})");
                    }
                }
            }
        }
    }

    // get_spin round-trip via flip
    #[test]
    fn flip_roundtrip() {
        let n = 4;
        let mut data = make_ferro(n);
        flip_bit(&mut data, bit_index(2, 2, 2, n));
        assert_eq!(get_spin_raw(&data, 2, 2, 2, n), -1);
        flip_bit(&mut data, bit_index(2, 2, 2, n));
        assert_eq!(get_spin_raw(&data, 2, 2, 2, n), 1);
    }

    // Ferromagnetic state: all spins +1
    #[test]
    fn ferro_all_up() {
        let n = 4;
        let data = make_ferro(n);
        for z in 0..n {
            for y in 0..n {
                for x in 0..n {
                    assert_eq!(get_spin_raw(&data, x, y, z, n), 1, "({x},{y},{z})");
                }
            }
        }
    }

    // Magnetization of all-up lattice = 1.0
    #[test]
    fn magnetization_ferro() {
        let n = 4;
        let data = make_ferro(n);
        let n3 = n * n * n;
        let sum: i32 = (0..n3 / 8).map(|i| 2 * data[i].count_ones() as i32 - 8).sum();
        let mag = sum as f64 / n3 as f64;
        assert!((mag - 1.0).abs() < 1e-10, "mag = {mag}");
    }

    // Neel state: spin at (x,y,z) = (-1)^(x+y+z)
    #[test]
    fn neel_spins_correct() {
        let n = 4;
        let data = make_neel(n);
        for z in 0..n {
            for y in 0..n {
                for x in 0..n {
                    let expected = if (x + y + z) % 2 == 0 { 1 } else { -1 };
                    assert_eq!(get_spin_raw(&data, x, y, z, n), expected, "({x},{y},{z})");
                }
            }
        }
    }

    // energy_at for all-up: local energy = -k1 * 6, flipping gives +k1 * 6, ΔE = 12k1
    #[test]
    fn energy_flip_nn_only() {
        let n = 4;
        let k1 = 1.0;
        let data = make_ferro(n);

        let e_before = energy_at(&data, 2, 2, 2, n, k1, 0.0, 0.0);
        assert!((e_before + 6.0).abs() < 1e-10, "e_before={e_before}");

        let mut flipped = data.clone();
        flip_bit(&mut flipped, bit_index(2, 2, 2, n));
        let e_after = energy_at(&flipped, 2, 2, 2, n, k1, 0.0, 0.0);
        assert!((e_after - 6.0).abs() < 1e-10, "e_after={e_after}");
        assert!((e_after - e_before - 12.0).abs() < 1e-10, "ΔE={}", e_after - e_before);
    }

    // energy_at with NNN: ΔE = 12k1 + 24k2
    #[test]
    fn energy_flip_with_nnn() {
        let n = 4;
        let k1 = 1.0;
        let k2 = 1.0;
        let data = make_ferro(n);
        let e_before = energy_at(&data, 2, 2, 2, n, k1, k2, 0.0);
        let mut flipped = data.clone();
        flip_bit(&mut flipped, bit_index(2, 2, 2, n));
        let e_after = energy_at(&flipped, 2, 2, 2, n, k1, k2, 0.0);
        assert!(
            (e_after - e_before - (12.0 * k1 + 24.0 * k2)).abs() < 1e-10,
            "ΔE={} expected={}", e_after - e_before, 12.0 * k1 + 24.0 * k2
        );
    }

    // Periodic boundary: get_spin wraps correctly
    #[test]
    fn periodic_boundary() {
        let n = 4;
        let mut data = make_ferro(n);
        flip_bit(&mut data, bit_index(0, 0, 0, n)); // (0,0,0) → -1
        flip_bit(&mut data, bit_index(3, 0, 0, n)); // (3,0,0) → -1
        // x=4 wraps to 0, x=-4 wraps to 0
        assert_eq!(get_spin(&data,  4, 0, 0, n), -1, "4 mod 4 = 0");
        assert_eq!(get_spin(&data, -4, 0, 0, n), -1, "-4 mod 4 = 0");
        // x=-1 wraps to 3
        assert_eq!(get_spin(&data, -1, 0, 0, n), -1, "-1 mod 4 = 3");
        // unflipped site still +1
        assert_eq!(get_spin(&data,  1, 0, 0, n),  1, "(1,0,0) untouched");
    }

    // Neel order param = 1 for perfect Neel state
    #[test]
    fn neel_order_param_perfect() {
        let n = 4;
        let data = make_neel(n);
        let n3 = n * n * n;
        let mut sum = 0.0f64;
        for z in 0..n {
            for y in 0..n {
                for x in 0..n {
                    let sign = if (x + y + z) % 2 == 0 { 1.0 } else { -1.0 };
                    sum += sign * get_spin_raw(&data, x, y, z, n) as f64;
                }
            }
        }
        let op = (sum / n3 as f64).abs();
        assert!((op - 1.0).abs() < 1e-10, "neel_op={op}");
    }
}
